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
	StencilCategory,
	ToolbarItem,
	ToolbarSection,
} from "../../src";
import {
	Canvas,
	darkCanvasTheme,
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
	 * The shape tools of the bar only — not the whole bar. The kit closes the tool
	 * section with the shape library toggle and appends
	 * `DEFAULT_TOOLBAR_VIEW_SECTION`, so a page declaring its plugin's presets
	 * keeps the sidebar toggle, undo / redo, zoom, help and the properties toggle
	 * without naming them. Omit to take the canvas default bar, whose tools pin the
	 * core presets only and show nothing a plugin contributes; pass items whenever
	 * a spec drives a plugin's preset or category flyout. `CanvasDriver.goto()`
	 * waits for the "Rectangle" tool, so keep the `rect` preset in any items passed
	 * here.
	 */
	toolbarItems?: ToolbarItem[];
	/**
	 * Sections of the shape library sidebar, mirroring how a host app declares one.
	 * Omit and neither the sidebar nor the toolbar toggle that opens it is
	 * rendered; pass sections whenever a spec drives the sidebar. Independent of
	 * `toolbarItems` — the same category can appear in both.
	 */
	stencilLibrarySections?: StencilCategory[];
};

const emptyDoc: CanvasDoc = { version: 1, root: [] };

type HarnessAppProps = {
	initialConfig: CanvasConfig;
	toolbarItems: ToolbarItem[] | undefined;
	stencilLibrarySections: StencilCategory[] | undefined;
	parser: CanvasParser;
};

/**
 * Default page mounting a single Canvas on an empty document; ?multi switches to the
 * two-canvas setup and ?pageScroll to the canvas embedded in a scrolling document.
 * Restoring a dropped jiscribe export PNG (with .jis.json in its iTXt) is a
 * contract scenario/image-export-roundtrip depends on, so the harness provides it too.
 */
function HarnessApp({
	initialConfig,
	toolbarItems,
	stencilLibrarySections,
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

	// The tool section is the page's items plus the two the core default ends with, so a
	// page that declares only its plugin's presets still gets the "All shapes" toggle when
	// it declared a library. Without a library both are dropped by resolution — the toggle
	// as unusable, the divider as stranded — leaving the bar as the page declared it.
	const toolbarSections = useMemo<ToolbarSection[] | undefined>(
		() =>
			toolbarItems
				? [
						{
							id: "tools",
							items: [
								...toolbarItems,
								{ type: "divider" },
								{ type: "stencilLibraryToggle" },
							],
						},
						DEFAULT_TOOLBAR_VIEW_SECTION,
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
	return (
		<div className="app" onDrop={handleDrop} onDragOver={handleDragOver}>
			<Canvas
				ref={canvasHandleRef}
				doc={loadedDoc}
				theme={darkCanvasTheme}
				initialConfig={initialConfig}
				toolbar={toolbarSections ? { sections: toolbarSections } : undefined}
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
 * @param params - The plugin set, toolbar and sidebars the page is built around. See {@link PluginHarnessParams}.
 */
export function mountPluginHarness(params: PluginHarnessParams): void {
	const initialConfig: CanvasConfig = { plugins: params.plugins };
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
				stencilLibrarySections={params.stencilLibrarySections}
				parser={parser}
			/>
		</React.StrictMode>,
	);
}
