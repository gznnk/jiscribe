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
	BottomToolbarOptions,
	CanvasConfig,
	CanvasDoc,
	CanvasHandle,
	CanvasParser,
	CanvasPlugin,
	OpenReferencePayload,
	ResolveImage,
	StencilCategory,
	ToolbarItem,
	ToolbarSection,
} from "../../src";
import {
	Canvas,
	darkCanvasTheme,
	DEFAULT_TOOLBAR_HISTORY_SECTION,
	DEFAULT_TOOLBAR_PROPERTIES_SECTION,
	DEFAULT_TOOLBAR_SIDEBARS_SECTION,
	DEFAULT_TOOLBAR_VIEW_SECTION,
	extractCanvasSourceFromPng,
} from "../../src";
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
	 * The shape tools of the top bar only — not the whole bar. The kit opens the
	 * tool section with the shape library toggle and appends core's history, view
	 * and properties sections and the switch for both sidebars, so a page
	 * declaring its plugin's presets keeps the sidebar toggles, undo / redo, zoom
	 * and help without naming them. Omit to take the canvas default bar, which
	 * pins no preset at all; pass items whenever a spec drives a plugin's preset
	 * or category flyout from the top bar. `CanvasDriver.goto()` waits for the
	 * "Rectangle" tool, so keep the `rect` preset in these items or in
	 * `bottomToolbarPresetIds`.
	 */
	toolbarItems?: ToolbarItem[];
	/**
	 * Presets of the bottom tool bar, in display order. Omit and the page shows
	 * no bottom bar at all — not the canvas's default one — so a page pinning its
	 * presets on the top bar does not show each of them twice (the specs'
	 * `toolButton` would then match two buttons). A preset belongs in this list or
	 * in `toolbarItems`, not both.
	 */
	bottomToolbarPresetIds?: string[];
	/**
	 * Sections of the shape library sidebar, mirroring how a host app declares one.
	 * Omit and neither the sidebar nor the toolbar toggle that opens it is
	 * rendered; pass sections whenever a spec drives the sidebar. Independent of
	 * `toolbarItems` — the same category can appear in both.
	 */
	stencilLibrarySections?: StencilCategory[];
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
	toolbarItems: ToolbarItem[] | undefined;
	bottomToolbar: BottomToolbarOptions;
	stencilLibrarySections: StencilCategory[] | undefined;
	resolveImage: ResolveImage | undefined;
	parser: CanvasParser;
};

/**
 * Default page mounting a single Canvas on an empty document; ?multi switches to the
 * two-canvas setup, ?pageScroll to the canvas embedded in a scrolling document, and
 * ?noStencilLibrary keeps the default page but declares no shape library.
 * Restoring a dropped jiscribe export PNG (with .jis in its iTXt) is a
 * contract scenario/image-export-roundtrip depends on, so the harness provides it too.
 */
function HarnessApp({
	initialConfig,
	toolbarItems,
	bottomToolbar,
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

	// The tool section is the shape library toggle and a divider, then the page's items, so
	// a page that declares only its plugin's presets still gets the toggle when it declared
	// a library. Without a library both are dropped by resolution — the toggle
	// as unusable, the divider as stranded — leaving the bar as the page declared it.
	const toolbarSections = useMemo<ToolbarSection[] | undefined>(
		() =>
			toolbarItems
				? [
						{
							id: "tools",
							items: [
								{ type: "stencilLibraryToggle" },
								{ type: "divider" },
								...toolbarItems,
							],
						},
						DEFAULT_TOOLBAR_HISTORY_SECTION,
						DEFAULT_TOOLBAR_VIEW_SECTION,
						DEFAULT_TOOLBAR_PROPERTIES_SECTION,
						DEFAULT_TOOLBAR_SIDEBARS_SECTION,
					]
				: undefined,
		[toolbarItems],
	);

	const query = new URLSearchParams(window.location.search);
	if (query.has("multi")) {
		return <MultiCanvasApp />;
	}
	if (query.has("pageScroll")) {
		return <PageScrollApp />;
	}
	// ?noStencilLibrary drops the page's library, for specs on how the chrome
	// behaves when a host declares none.
	const pageStencilLibrarySections = query.has("noStencilLibrary")
		? undefined
		: stencilLibrarySections;
	return (
		<div className="app" onDrop={handleDrop} onDragOver={handleDragOver}>
			<Canvas
				ref={canvasHandleRef}
				doc={loadedDoc}
				theme={darkCanvasTheme}
				initialConfig={initialConfig}
				resolveImage={resolveImage}
				onOpenReference={handleOpenReference}
				toolbar={toolbarSections ? { sections: toolbarSections } : undefined}
				bottomToolbar={bottomToolbar}
				stencilLibrary={
					pageStencilLibrarySections
						? { sections: pageStencilLibrarySections }
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
 * @param params - The plugin set, toolbar and sidebars the page is built around. See {@link PluginHarnessParams}.
 */
export function mountPluginHarness(params: PluginHarnessParams): void {
	const initialConfig: CanvasConfig = { plugins: params.plugins };
	const bottomToolbar: BottomToolbarOptions = params.bottomToolbarPresetIds
		? { presetIds: params.bottomToolbarPresetIds }
		: { show: false };
	const parser = createCanvasParser({ plugins: params.plugins });

	// The specs were written against the demo app's dark default, so the harness pins dark too,
	// letting the surrounding color follow the canvas.
	document.documentElement.style.colorScheme = "dark";
	document.body.style.backgroundColor = darkCanvasTheme.tokens.canvasBg;

	ReactDOM.createRoot(document.getElementById("root")!).render(
		<React.StrictMode>
			<HarnessApp
				initialConfig={initialConfig}
				toolbarItems={params.toolbarItems}
				bottomToolbar={bottomToolbar}
				stencilLibrarySections={params.stencilLibrarySections}
				resolveImage={params.resolveImage}
				parser={parser}
			/>
		</React.StrictMode>,
	);
}
