// flowchart / container / markdown / sticky / uml / general / annotation 図形は
// @jiscribe/plugin-flowchart-shapes / @jiscribe/plugin-container-shapes /
// @jiscribe/plugin-markdown-shape / @jiscribe/plugin-sticky-shape /
// @jiscribe/plugin-uml-shapes / @jiscribe/plugin-general-shapes /
// @jiscribe/plugin-annotation-shapes から供給する
// (packages/canvas/docs/13-authoring-plugins.md)。この Webview 側は React を
// 含む Canvas 一式を既に読み込んでいるので、プラグインの通常エントリ (./index)
// を使ってよい。`plugins` は index.tsx の `initialConfig` とも共有する。
import { createCanvasParser } from "@jiscribe/canvas/doc";
import { annotationPlugin } from "@jiscribe/plugin-annotation-shapes";
import { containerPlugin } from "@jiscribe/plugin-container-shapes";
import { flowchartPlugin } from "@jiscribe/plugin-flowchart-shapes";
import { generalPlugin } from "@jiscribe/plugin-general-shapes";
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
];

export const canvasParser = createCanvasParser({ plugins });
