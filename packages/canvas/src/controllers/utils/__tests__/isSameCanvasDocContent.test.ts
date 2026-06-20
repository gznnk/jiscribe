import { describe, it, expect } from "vitest";

import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import { isSameCanvasDocContent } from "../isSameCanvasDocContent";

// 実際の入力経路（ファイル → JSON.parse）に合わせ、JSON 文字列から doc を生成する。
// これによりテストごとにキーの挿入順を厳密に制御できる。
const parseDoc = (json: string): CanvasDoc => JSON.parse(json) as CanvasDoc;

const rectJson = `{
	"id": "rect-1",
	"type": "rect",
	"x": 10,
	"y": 20,
	"width": 100,
	"height": 50
}`;

describe("isSameCanvasDocContent", () => {
	it("同一内容の doc（別インスタンス）は同一と判定する", () => {
		const docA = parseDoc(`{ "version": 1, "root": [${rectJson}] }`);
		const docB = parseDoc(`{ "version": 1, "root": [${rectJson}] }`);
		expect(isSameCanvasDocContent(docA, docB)).toBe(true);
	});

	it("オブジェクトのプロパティ値が異なれば異なると判定する", () => {
		const docA = parseDoc(`{ "version": 1, "root": [${rectJson}] }`);
		const docB = parseDoc(
			`{ "version": 1, "root": [${rectJson.replace('"x": 10', '"x": 11')}] }`,
		);
		expect(isSameCanvasDocContent(docA, docB)).toBe(false);
	});

	it("root の要素数が異なれば異なると判定する", () => {
		const docA = parseDoc(`{ "version": 1, "root": [${rectJson}] }`);
		const docB = parseDoc(`{ "version": 1, "root": [] }`);
		expect(isSameCanvasDocContent(docA, docB)).toBe(false);
	});

	it("$schema の有無・違いは比較に影響しない", () => {
		const docA = parseDoc(
			`{ "$schema": "./jiscribe.schema.json", "version": 1, "root": [] }`,
		);
		const docB = parseDoc(`{ "version": 1, "root": [] }`);
		expect(isSameCanvasDocContent(docA, docB)).toBe(true);
	});

	it("トップレベルのキー順の違いは比較に影響しない", () => {
		const docA = parseDoc(`{ "root": [${rectJson}], "version": 1 }`);
		const docB = parseDoc(`{ "version": 1, "root": [${rectJson}] }`);
		expect(isSameCanvasDocContent(docA, docB)).toBe(true);
	});

	it("オブジェクト内のキー順が異なると、内容が同じでも異なると判定する（既知の false negative）", () => {
		// この振る舞いは仕様: 呼び出し側は「同一ならスキップ」の最適化にのみ
		// 使うため、false negative は安全側（従来どおり処理が走る）に倒れる。
		const docA = parseDoc(
			`{ "version": 1, "root": [{ "id": "rect-1", "type": "rect" }] }`,
		);
		const docB = parseDoc(
			`{ "version": 1, "root": [{ "type": "rect", "id": "rect-1" }] }`,
		);
		expect(isSameCanvasDocContent(docA, docB)).toBe(false);
	});
});
