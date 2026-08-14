/// <reference types="vite/client" />

import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

import { MultiCanvasApp } from "./MultiCanvasApp";
import { PageScrollApp } from "./PageScrollApp";
import type {
	CanvasConfig,
	CanvasDoc,
	CanvasParser,
	CanvasPlugin,
	ToolbarEntry,
} from "../../src";
import { Canvas, darkCanvasTheme, extractCanvasSourceFromPng } from "../../src";
import { createCanvasParser } from "../../src/doc";
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
	 * Toolbar arrangement, mirroring how a host app composes one. Omit to take the
	 * canvas default layout, which pins the core presets only and shows nothing a
	 * plugin contributes; pass a layout whenever a spec drives a plugin's preset or
	 * category flyout. `CanvasDriver.goto()` waits for the "Rectangle" tool, so keep
	 * the `rect` preset in any layout passed here.
	 */
	toolbarLayout?: ToolbarEntry[];
};

const emptyDoc: CanvasDoc = { version: 1, root: [] };

type HarnessAppProps = {
	initialConfig: CanvasConfig;
	toolbarLayout: ToolbarEntry[] | undefined;
	parser: CanvasParser;
};

/**
 * Default page mounting a single Canvas on an empty document; ?multi switches to the
 * two-canvas setup and ?pageScroll to the canvas embedded in a scrolling document.
 * Restoring a dropped jiscribe export PNG (with .jis.json in its iTXt) is a
 * contract scenario/image-export-roundtrip depends on, so the harness provides it too.
 */
function HarnessApp({ initialConfig, toolbarLayout, parser }: HarnessAppProps) {
	const [loadedDoc, setLoadedDoc] = useState<CanvasDoc>(emptyDoc);

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
				doc={loadedDoc}
				theme={darkCanvasTheme}
				initialConfig={initialConfig}
				toolbar={toolbarLayout ? { layout: toolbarLayout } : undefined}
			/>
		</div>
	);
}

/**
 * Renders the shared e2e harness page into `#root`, the element the harness
 * `index.html` provides. Call it once from the harness entry module; the layout
 * stylesheet comes with it.
 *
 * @param params - The plugin set and toolbar the page is built around. See {@link PluginHarnessParams}.
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
				toolbarLayout={params.toolbarLayout}
				parser={parser}
			/>
		</React.StrictMode>,
	);
}
