// flowchart / container / markdown / uml 図形は @workspace/plugin-flowchart-shapes /
// @workspace/plugin-container-shapes / @workspace/plugin-markdown-shape /
// @workspace/plugin-uml-shapes から供給する
// (docs/05_extensibility/plugin-architecture-requirements.md)。この Webview 側は React を
// 含む Canvas 一式を既に読み込んでいるので、プラグインの通常エントリ (./index)
// を使ってよい。`plugins` は index.tsx の `initialConfig` とも共有する。
import { createCanvasParser } from "@workspace/canvas/doc";
import { containerPlugin } from "@workspace/plugin-container-shapes";
import { flowchartPlugin } from "@workspace/plugin-flowchart-shapes";
import { markdownPlugin } from "@workspace/plugin-markdown-shape";
import { umlPlugin } from "@workspace/plugin-uml-shapes";

export const plugins = [
	flowchartPlugin,
	containerPlugin,
	markdownPlugin,
	umlPlugin,
];

export const canvasParser = createCanvasParser({ plugins });
