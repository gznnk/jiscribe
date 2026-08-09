import {
	annotationPlugin,
	annotationToolbarEntry,
} from "@jiscribe/plugin-annotation-shapes";
import {
	containerPlugin,
	containerToolbarEntry,
} from "@jiscribe/plugin-container-shapes";
import {
	flowchartPlugin,
	flowchartToolbarEntry,
} from "@jiscribe/plugin-flowchart-shapes";
import {
	generalPlugin,
	generalToolbarEntry,
} from "@jiscribe/plugin-general-shapes";
import { markdownPlugin } from "@jiscribe/plugin-markdown-shape";
import { stickyPlugin } from "@jiscribe/plugin-sticky-shape";
import { umlPlugin, umlToolbarEntry } from "@jiscribe/plugin-uml-shapes";
import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "katex/dist/katex.min.css";

import { MultiCanvasApp } from "./MultiCanvasApp";
import type { CanvasConfig, CanvasDoc, ToolbarEntry } from "../../src";
import { Canvas, darkCanvasTheme, extractCanvasSourceFromPng } from "../../src";
import { createCanvasParser } from "../../src/doc";
import "./harness.css";

// The flowchart / container / markdown / sticky / general / annotation shapes were removed from
// core, leaving @jiscribe/plugin-flowchart-shapes / @jiscribe/plugin-container-shapes /
// @jiscribe/plugin-markdown-shape / @jiscribe/plugin-sticky-shape /
// @jiscribe/plugin-general-shapes / @jiscribe/plugin-annotation-shapes as their only source
// (docs/05_extensibility/plugin-architecture-requirements.md). They are registered in
// devDependencies as a dev-only circular dependency for e2e, keeping the related specs alive.
const plugins = [
	flowchartPlugin,
	containerPlugin,
	markdownPlugin,
	stickyPlugin,
	umlPlugin,
	generalPlugin,
	annotationPlugin,
];

const initialConfig: CanvasConfig = { plugins };

// The annotation / flowchart / container / general categories and the markdown / sticky presets
// come from plugins and are not in core's default layout. The specs depend on the flyout buttons
// and on the presets, so the harness passes a layout mirroring the apps' arrangement.
const toolbarLayout: ToolbarEntry[] = [
	{ kind: "preset", presetId: "rect" },
	{ kind: "preset", presetId: "ellipse" },
	{ kind: "preset", presetId: "polyline" },
	{ kind: "preset", presetId: "polygon" },
	{ kind: "preset", presetId: "text" },
	{ kind: "preset", presetId: "sticky" },
	{ kind: "preset", presetId: "markdown" },
	flowchartToolbarEntry,
	umlToolbarEntry,
	containerToolbarEntry,
	generalToolbarEntry,
	annotationToolbarEntry,
];

const harnessParser = createCanvasParser({ plugins });

// The specs were written against the demo app's dark default, so the harness pins dark too,
// letting the surrounding color follow the canvas.
document.documentElement.style.colorScheme = "dark";
document.body.style.backgroundColor = darkCanvasTheme.tokens.canvasBg;

const emptyDoc: CanvasDoc = { version: 1, root: [] };

/**
 * Default page mounting a single Canvas on an empty document; ?multi switches to the
 * two-canvas setup. Restoring a dropped jiscribe export PNG (with .jis.json in its iTXt) is a
 * contract scenario/image-export-roundtrip depends on, so the harness provides it too.
 */
function HarnessApp() {
	const [loadedDoc, setLoadedDoc] = useState<CanvasDoc>(emptyDoc);

	// Hook for a spec to trigger external sync (a doc swap from the parent, SYNC_EXTERNAL).
	// scenario/external-sync-cancels-drag.spec depends on it.
	useEffect(() => {
		(
			window as unknown as {
				__setHarnessDoc?: (docText: string) => void;
			}
		).__setHarnessDoc = (docText: string) => {
			const result = harnessParser.parse(docText);
			if (result.kind !== "ok") {
				throw new Error(`invalid harness doc: ${result.kind}`);
			}
			setLoadedDoc(result.doc);
		};
	}, []);

	const handleDrop = useCallback(async (e: React.DragEvent) => {
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
		const result = harnessParser.parse(sourceText);
		if (result.kind !== "ok") {
			console.warn("Embedded jiscribe source is invalid", result);
			return;
		}
		setLoadedDoc(result.doc);
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
	}, []);

	if (new URLSearchParams(window.location.search).has("multi")) {
		return <MultiCanvasApp />;
	}
	return (
		<div className="app" onDrop={handleDrop} onDragOver={handleDragOver}>
			<Canvas
				doc={loadedDoc}
				theme={darkCanvasTheme}
				initialConfig={initialConfig}
				toolbar={{ layout: toolbarLayout }}
			/>
		</div>
	);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<HarnessApp />
	</React.StrictMode>,
);
