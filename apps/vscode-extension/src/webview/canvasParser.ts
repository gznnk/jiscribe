// container 図形は @workspace/plugin-container-shapes から供給する
// (docs/05_extensibility/uc1-container-extraction-log.md)。この Webview 側は
// React を含む Canvas 一式を既に読み込んでいるので、プラグインの通常エントリ
// (./index) を使ってよい。
import { createCanvasParser } from "@workspace/canvas/parser";
import { containerParserExtension } from "@workspace/plugin-container-shapes/parser";

export const canvasParser = createCanvasParser({
	extensions: [containerParserExtension],
});
