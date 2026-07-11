import { describe, expect, it } from "vitest";

import {
	extractCanvasSourceFromSvgText,
	replaceCanvasSourceInSvgText,
} from "../svgSourceText";

/**
 * embedCanvasSource + XMLSerializer が出力する形を模した SVG テキスト。
 * テキストノードのシリアライズでは & < > がエスケープされる。
 */
const buildExportedSvg = (escapedSourceContent: string): string =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
	`<metadata><jiscribe:source xmlns:jiscribe="https://jiscribe.dev/ns/canvas" ` +
	`data-jiscribe-version="1">${escapedSourceContent}</jiscribe:source></metadata>` +
	`<rect x="0" y="0" width="100" height="100"/></svg>`;

describe("extractCanvasSourceFromSvgText", () => {
	it("埋め込みソース JSON を取り出す", () => {
		const svgText = buildExportedSvg('{"version":1,"root":[]}');
		expect(extractCanvasSourceFromSvgText(svgText)).toBe(
			'{"version":1,"root":[]}',
		);
	});

	it("XML エスケープされた文字（& < > と文字参照）を復元する", () => {
		const svgText = buildExportedSvg(
			'{"text":"a &lt;b&gt; &amp; \'quo\' &quot;dq&quot; &#x1F600; &#65;"}',
		);
		expect(extractCanvasSourceFromSvgText(svgText)).toBe(
			'{"text":"a <b> & \'quo\' "dq" 😀 A"}',
		);
	});

	it("二重エスケープ（&amp;lt;）を過剰に復元しない", () => {
		const svgText = buildExportedSvg('{"text":"&amp;lt;"}');
		expect(extractCanvasSourceFromSvgText(svgText)).toBe('{"text":"&lt;"}');
	});

	it("埋め込みが無い SVG では null を返す", () => {
		expect(
			extractCanvasSourceFromSvgText(
				`<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>`,
			),
		).toBeNull();
	});

	it("埋め込み要素が空の場合は null を返す", () => {
		expect(extractCanvasSourceFromSvgText(buildExportedSvg("  "))).toBeNull();
	});
});

describe("replaceCanvasSourceInSvgText", () => {
	it("埋め込みソースを差し替え、開始タグの属性と周辺の SVG を保つ", () => {
		const svgText = buildExportedSvg('{"version":1,"root":[]}');
		const replaced = replaceCanvasSourceInSvgText(
			svgText,
			'{"version":1,"root":[{"id":"r1"}]}',
		);
		expect(replaced).toBe(
			buildExportedSvg('{"version":1,"root":[{"id":"r1"}]}'),
		);
	});

	it("差し替え後に extract すると同じ JSON が返る（エスケープ往復）", () => {
		const sourceJson = '{"text":"<b> & \\"q\\" $1 $& 日本語","n":1}';
		const replaced = replaceCanvasSourceInSvgText(
			buildExportedSvg("{}"),
			sourceJson,
		);
		expect(replaced).not.toBeNull();
		expect(extractCanvasSourceFromSvgText(replaced ?? "")).toBe(sourceJson);
	});

	it("埋め込みが無い SVG では null を返す", () => {
		expect(
			replaceCanvasSourceInSvgText(
				`<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>`,
				"{}",
			),
		).toBeNull();
	});
});
