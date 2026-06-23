import { describe, expect, it } from "vitest";

import { isValidRectState } from "../validateRectState";

const validRect = {
	id: "r1",
	type: "rect",
	cx: 0,
	cy: 0,
	width: 100,
	height: 50,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	stroke: "#000",
	strokeWidth: 2,
	fill: "#fff",
	fontSize: 16,
	rx: 4,
};

describe("isValidRectState", () => {
	it("有効な Rect は true / 最小構成も true", () => {
		expect(isValidRectState(validRect)).toBe(true);
		expect(
			isValidRectState({
				id: "r1",
				type: "rect",
				cx: 0,
				cy: 0,
				width: 1,
				height: 1,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			}),
		).toBe(true);
	});

	it("type 不一致 / id 空は false", () => {
		expect(isValidRectState({ ...validRect, type: "ellipse" })).toBe(false);
		expect(isValidRectState({ ...validRect, id: "" })).toBe(false);
	});

	it("必須ジオメトリ欠落は false", () => {
		expect(isValidRectState({ ...validRect, width: undefined })).toBe(false);
		expect(isValidRectState({ ...validRect, scaleY: undefined })).toBe(false);
	});

	it.each(["width", "height", "rx", "strokeWidth"])(
		"%s が負数は false（スキーマ minimum: 0）",
		(key) => {
			expect(isValidRectState({ ...validRect, [key]: -1 })).toBe(false);
		},
	);

	it("cx / cy は負数でも true（位置に下限なし）", () => {
		expect(isValidRectState({ ...validRect, cx: -100, cy: -50 })).toBe(true);
	});

	it("fontSize < 1 は false（>= 1）", () => {
		expect(isValidRectState({ ...validRect, fontSize: 0 })).toBe(false);
	});

	it("CSS インジェクションを含む stroke / fill は false", () => {
		expect(isValidRectState({ ...validRect, stroke: "red; } body {" })).toBe(
			false,
		);
		expect(isValidRectState({ ...validRect, fill: "url(http://evil)" })).toBe(
			false,
		);
	});
});
