import { describe, it, expect } from "vitest";

import { isTransformedFrame } from "../isTransformedFrame";

describe("isTransformedFrame", () => {
	it("有効なTransformedFrameはtrueを返す", () => {
		expect(
			isTransformedFrame({
				cx: 50,
				cy: 30,
				width: 100,
				height: 60,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			}),
		).toBe(true);
	});

	it("Transformプロパティが欠けている場合はfalseを返す", () => {
		expect(isTransformedFrame({ cx: 50, cy: 30, width: 100, height: 60 })).toBe(
			false,
		);
	});

	it("Frameプロパティが欠けている場合はfalseを返す", () => {
		expect(isTransformedFrame({ rotation: 0, scaleX: 1, scaleY: 1 })).toBe(
			false,
		);
	});

	it("widthが負の場合はfalseを返す", () => {
		expect(
			isTransformedFrame({
				cx: 50,
				cy: 30,
				width: -10,
				height: 60,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			}),
		).toBe(false);
	});
});
