/// <reference types="vite/client" />

import { createCanvasParser } from "@jiscribe/doc";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import ReactDOM from "react-dom/client";

import { MultiCanvasApp } from "./MultiCanvasApp";
import { PageScrollApp } from "./PageScrollApp";
import type {
	CanvasConfig,
	CanvasDoc,
	CanvasHandle,
	CanvasParser,
	CanvasPlugin,
	OpenReferencePayload,
	ResolveImage,
	StencilCategory,
} from "../../src";
import { Canvas, darkCanvasTheme, extractCanvasSourceFromPng } from "../../src";
import "./harness.css";

/** What a harness page has to say about itself; everything else is fixed by the kit. */
export type PluginHarnessParams = {
	/**
	 * Plugins registered on the canvas, applied in declared order after the
	 * built-ins. A type already claimed by a built-in or an earlier plugin throws
	 * at mount. The same list backs the parser behind `window.__setHarnessDoc` and
	 * the dropped-PNG restore, so a doc using these types stays parseable.
	 */
	plugins: readonly CanvasPlugin[];
	/**
	 * The presets at the top of the stencil rail, in order (the canvas's
	 * `rail.presetIds`). Omit for the canvas default, core's primitives only;
	 * pass ids whenever a spec drives a plugin's preset from the rail.
	 * `CanvasDriver.goto()` waits for the "Rectangle" tool, so keep `rect` in any
	 * list passed here. The toolbar is always the canvas default (undo / redo,
	 * zoom, help, the properties toggle).
	 */
	railPresetIds?: string[];
	/**
	 * Sections of the stencil library, mirroring how a host app declares one:
	 * what the rail's pinned categories and its catalog draw from. Omit and the
	 * rail shows its presets alone, with no catalog button; pass sections
	 * whenever a spec drives a category or the catalog.
	 */
	stencilLibrarySections?: StencilCategory[];
	/**
	 * Ids of the sections pinned to the rail at mount, in rail order
	 * (`CanvasConfig.pinnedCategoryIds`). Omit and nothing is pinned, so a
	 * category is reached through the catalog only; pin it whenever a spec opens
	 * it from its rail button (`CanvasDriver.drawShapeFromFlyout` and the like).
	 * An id naming no section of `stencilLibrarySections` is kept but not drawn.
	 */
	pinnedCategoryIds?: string[];
	/**
	 * Stands in for the host that reads an image object's file. Omit it and every
	 * image on the page draws its placeholder, which is what a page with no
	 * images at all wants; pass one whenever a spec drives an `image`.
	 */
	resolveImage?: ResolveImage;
};

const emptyDoc: CanvasDoc = { version: 1, root: [] };

type HarnessAppProps = {
	initialConfig: CanvasConfig;
	railPresetIds: string[] | undefined;
	stencilLibrarySections: StencilCategory[] | undefined;
	resolveImage: ResolveImage | undefined;
	parser: CanvasParser;
};

/**
 * Default page mounting a single Canvas on an empty document; ?multi switches to the
 * two-canvas setup and ?pageScroll to the canvas embedded in a scrolling document.
 * Restoring a dropped jiscribe export PNG (with .jis in its iTXt) is a
 * contract scenario/image-export-roundtrip depends on, so the harness provides it too.
 */
function HarnessApp({
	initialConfig,
	railPresetIds,
	stencilLibrarySections,
	resolveImage,
	parser,
}: HarnessAppProps) {
	const [loadedDoc, setLoadedDoc] = useState<CanvasDoc>(emptyDoc);
	const canvasHandleRef = useRef<CanvasHandle>(null);

	// Hook for a spec to trigger external sync (a doc swap from the parent, SYNC_EXTERNAL).
	// scenario/external-sync-cancels-drag.spec depends on it.
	useEffect(() => {
		(
			window as unknown as {
				__setHarnessDoc?: (docText: string) => void;
			}
		).__setHarnessDoc = (docText: string) => {
			const result = parser.parse(docText);
			if (result.kind !== "ok") {
				throw new Error(`invalid harness doc: ${result.kind}`);
			}
			setLoadedDoc(result.doc);
		};
	}, [parser]);

	// The imperative handle reaches a host through the ref prop and nowhere else:
	// none of what it answers is readable off the DOM. api/canvas-handle.spec
	// drives it through this. Only the default page has one canvas to publish.
	useEffect(() => {
		(
			window as unknown as { __canvasHandle?: CanvasHandle | null }
		).__canvasHandle = canvasHandleRef.current;
	}, []);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			const file = e.dataTransfer.files[0];
			if (!file || file.type !== "image/png") {
				return;
			}
			const sourceText = await extractCanvasSourceFromPng(file);
			if (sourceText === null) {
				console.warn("Dropped PNG has no embedded jiscribe source");
				return;
			}
			const result = parser.parse(sourceText);
			if (result.kind !== "ok") {
				console.warn("Embedded jiscribe source is invalid", result);
				return;
			}
			setLoadedDoc(result.doc);
		},
		[parser],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
	}, []);

	// Stands in for a host that opens a `meta.reference`, so a spec can see the
	// "open reference" buttons and what pressing one hands over. Only an object
	// carrying a reference offers the button, so the other specs see no change.
	// ui/property-panel-meta.spec reads the log.
	const handleOpenReference = useCallback((payload: OpenReferencePayload) => {
		const harnessWindow = window as unknown as {
			__openedReferences?: OpenReferencePayload[];
		};
		harnessWindow.__openedReferences = [
			...(harnessWindow.__openedReferences ?? []),
			payload,
		];
	}, []);

	// Every pin order the canvas reports, so a spec can see what a host would
	// persist. ui/stencil-rail-overflow.spec reads the log.
	const handlePinnedCategoriesChange = useCallback(
		(pinnedCategoryIds: string[]) => {
			const harnessWindow = window as unknown as {
				__pinnedCategoryChanges?: string[][];
			};
			harnessWindow.__pinnedCategoryChanges = [
				...(harnessWindow.__pinnedCategoryChanges ?? []),
				pinnedCategoryIds,
			];
		},
		[],
	);

	// Memoized: an object built per render would defeat the canvas's memo.
	const rail = useMemo(
		() => (railPresetIds ? { presetIds: railPresetIds } : undefined),
		[railPresetIds],
	);

	const query = new URLSearchParams(window.location.search);
	if (query.has("multi")) {
		return <MultiCanvasApp />;
	}
	if (query.has("pageScroll")) {
		return <PageScrollApp />;
	}
	return (
		<div className="app" onDrop={handleDrop} onDragOver={handleDragOver}>
			<Canvas
				ref={canvasHandleRef}
				doc={loadedDoc}
				theme={darkCanvasTheme}
				initialConfig={initialConfig}
				resolveImage={resolveImage}
				onOpenReference={handleOpenReference}
				onPinnedCategoriesChange={handlePinnedCategoriesChange}
				rail={rail}
				stencilLibrary={
					stencilLibrarySections
						? { sections: stencilLibrarySections }
						: undefined
				}
			/>
		</div>
	);
}

/**
 * Renders the shared e2e harness page into `#root`, the element the harness
 * `index.html` provides. Call it once from the harness entry module; the layout
 * stylesheet comes with it.
 *
 * @param params - The plugin set, rail and library the page is built around. See {@link PluginHarnessParams}.
 */
export function mountPluginHarness(params: PluginHarnessParams): void {
	const initialConfig: CanvasConfig = {
		plugins: params.plugins,
		pinnedCategoryIds: params.pinnedCategoryIds,
	};
	const parser = createCanvasParser({ plugins: params.plugins });

	// The specs were written against the demo app's dark default, so the harness pins dark too,
	// letting the surrounding color follow the canvas.
	document.documentElement.style.colorScheme = "dark";
	document.body.style.backgroundColor = darkCanvasTheme.tokens.canvasBg;

	ReactDOM.createRoot(document.getElementById("root")!).render(
		<React.StrictMode>
			<HarnessApp
				initialConfig={initialConfig}
				railPresetIds={params.railPresetIds}
				stencilLibrarySections={params.stencilLibrarySections}
				resolveImage={params.resolveImage}
				parser={parser}
			/>
		</React.StrictMode>,
	);
}
