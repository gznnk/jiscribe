import { describe, it, expect } from "vitest";

import { isTextStyleState } from "../TextStyleState";

// NOTE: 具体的な CSS カラーの検証は isCssColor（CSS.supports）に依存し、
// このパッケージの vitest 環境（node）には CSS が無いため検証できない。
// ここでは sentinel "auto" の許容（env 非依存で短絡評価される経路）を担保する。
describe("isTextStyleState", () => {
	it('sentinel "auto"（テーマ追従）の fontColor を受け入れる', () => {
		// auto を弾くと TextEditorLayer が描画されずテキスト編集できなくなる（issue #38）
		expect(isTextStyleState({ fontColor: "auto" })).toBe(true);
	});

	it("fontColor が無くても他の text 系プロパティで検証できる", () => {
		expect(
			isTextStyleState({
				text: "hello",
				textAlign: "center",
				verticalAlign: "middle",
				fontSize: 16,
			}),
		).toBe(true);
	});

	it("不正な textAlign は fontColor 検証に到達する前に拒否する", () => {
		expect(isTextStyleState({ textAlign: "justify" })).toBe(false);
	});
});
