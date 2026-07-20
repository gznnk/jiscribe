// container 図形は @workspace/plugin-container-shapes から供給する
// (docs/05_extensibility/canvas-plugin-design.md)。この Webview 側は React を
// 含む Canvas 一式を既に読み込んでいるので、プラグインの通常エントリ (./index)
// を使ってよい。`plugins` は index.tsx の `initialConfig` とも共有する。
import { createCanvasParser } from "@workspace/canvas/parser";
import { containerPlugin } from "@workspace/plugin-container-shapes";

export const plugins = [containerPlugin];

export const canvasParser = createCanvasParser({ plugins });
