import { describe, expect, it } from "vitest";

import {
	hasValidIdAndType,
	isValidArrowFields,
	isValidChildIds,
	isValidFillStyleState,
	isValidFrameState,
	isValidPolyState,
	isValidStrokeStyleState,
	isValidTextStyleState,
	isValidTransformState,
} from "../validateStateUtils";

describe("validateStateUtils", () => {
	describe("hasValidIdAndType", () => {
		it("非空 id と一致する type は true", () => {
			expect(hasValidIdAndType({ id: "a", type: "rect" }, "rect")).toBe(true);
		});
		it("空 id / 型不一致 / id 非文字列は false", () => {
			expect(hasValidIdAndType({ id: "", type: "rect" }, "rect")).toBe(false);
			expect(hasValidIdAndType({ id: "a", type: "ellipse" }, "rect")).toBe(
				false,
			);
			expect(hasValidIdAndType({ id: 1, type: "rect" }, "rect")).toBe(false);
		});
	});

	describe("isValidFrameState", () => {
		it("cx/cy/width/height が数値なら true", () => {
			expect(isValidFrameState({ cx: 0, cy: 0, width: 10, height: 10 })).toBe(
				true,
			);
		});
		it("いずれか欠落/非数値なら false", () => {
			expect(isValidFrameState({ cx: 0, cy: 0, width: 10 })).toBe(false);
			expect(isValidFrameState({ cx: 0, cy: 0, width: "10", height: 10 })).toBe(
				false,
			);
		});
	});

	describe("isValidTransformState", () => {
		it("rotation/scaleX/scaleY が数値なら true", () => {
			expect(isValidTransformState({ rotation: 0, scaleX: 1, scaleY: 1 })).toBe(
				true,
			);
		});
		it("欠落なら false", () => {
			expect(isValidTransformState({ rotation: 0, scaleX: 1 })).toBe(false);
		});
	});

	describe("isValidStrokeStyleState", () => {
		it("妥当な stroke はエラーなし", () => {
			expect(isValidStrokeStyleState({ stroke: "#000", strokeWidth: 2 })).toBe(
				true,
			);
			expect(isValidStrokeStyleState({})).toBe(true);
		});
		it("CSS インジェクションを含む stroke は false", () => {
			expect(isValidStrokeStyleState({ stroke: "red; } body {" })).toBe(false);
		});
		it("不正な strokeDashType は false", () => {
			expect(isValidStrokeStyleState({ strokeDashType: "double" })).toBe(false);
		});
	});

	describe("isValidFillStyleState", () => {
		it("妥当な fill / 省略は true", () => {
			expect(isValidFillStyleState({ fill: "transparent" })).toBe(true);
			expect(isValidFillStyleState({})).toBe(true);
		});
		it("インジェクションを含む fill は false", () => {
			expect(isValidFillStyleState({ fill: "url(http://evil/x)" })).toBe(false);
		});
	});

	describe("isValidTextStyleState", () => {
		it("テキスト無し/妥当なフォントは true", () => {
			expect(isValidTextStyleState({})).toBe(true);
			expect(
				isValidTextStyleState({
					fontFamily: "Noto Sans JP",
					fontWeight: "600",
				}),
			).toBe(true);
		});
		it("fontFamily / fontWeight のインジェクションは false", () => {
			expect(isValidTextStyleState({ fontFamily: "Arial; } body {" })).toBe(
				false,
			);
			expect(isValidTextStyleState({ fontWeight: "bold } html {" })).toBe(
				false,
			);
		});
	});

	describe("isValidArrowFields", () => {
		it("妥当な ArrowType / 省略は true", () => {
			expect(isValidArrowFields({ startArrow: "None" })).toBe(true);
			expect(isValidArrowFields({})).toBe(true);
		});
		it("不正な ArrowType は false", () => {
			expect(isValidArrowFields({ endArrow: "diamond" })).toBe(false);
		});
	});

	describe("isValidChildIds", () => {
		it("文字列配列は true", () => {
			expect(isValidChildIds({ childIds: ["a", "b"] })).toBe(true);
			expect(isValidChildIds({ childIds: [] })).toBe(true);
		});
		it("非配列/非文字列要素は false", () => {
			expect(isValidChildIds({ childIds: "a" })).toBe(false);
			expect(isValidChildIds({ childIds: ["a", 1] })).toBe(false);
		});
	});

	describe("isValidPolyState", () => {
		it("points 配列は true", () => {
			expect(
				isValidPolyState({
					points: [
						{ x: 0, y: 0 },
						{ x: 1, y: 1 },
					],
				}),
			).toBe(true);
		});
		it("points 無しは false", () => {
			expect(isValidPolyState({})).toBe(false);
		});
	});
});
