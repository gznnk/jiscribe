// The flowchart / container / markdown / sticky / uml / general / annotation / lucideIcon shapes are
// @jiscribe/plugin-flowchart-shapes / @jiscribe/plugin-container-shapes /
// @jiscribe/plugin-markdown-shape / @jiscribe/plugin-sticky-shape /
// @jiscribe/plugin-uml-shapes / @jiscribe/plugin-general-shapes /
// @jiscribe/plugin-annotation-shapes / @jiscribe/plugin-lucide-icon-shape
// (packages/canvas/docs/13-authoring-plugins.md). This webview already loads the whole
// Canvas, React included, so it may use each plugin's regular entry point (./index).
// `plugins` is shared with the `initialConfig` in index.tsx.
import { createCanvasParser } from "@jiscribe/canvas/doc";
import { annotationPlugin } from "@jiscribe/plugin-annotation-shapes";
import { containerPlugin } from "@jiscribe/plugin-container-shapes";
import { flowchartPlugin } from "@jiscribe/plugin-flowchart-shapes";
import { generalPlugin } from "@jiscribe/plugin-general-shapes";
import { lucideIconPlugin } from "@jiscribe/plugin-lucide-icon-shape";
import { markdownPlugin } from "@jiscribe/plugin-markdown-shape";
import { stickyPlugin } from "@jiscribe/plugin-sticky-shape";
import { umlPlugin } from "@jiscribe/plugin-uml-shapes";

export const plugins = [
	flowchartPlugin,
	containerPlugin,
	markdownPlugin,
	stickyPlugin,
	umlPlugin,
	generalPlugin,
	annotationPlugin,
	lucideIconPlugin,
];

export const canvasParser = createCanvasParser({ plugins });
