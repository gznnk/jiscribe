import { describe, it, expect } from "vitest";

import { isTransformedRect } from "../isTransformedRect";

describe("isTransformedRect", () => {
	it("有効なTransformedRectはtrueを返す", () => {
		expect(
			isTransformedRect({
				x: 0,
				y: 0,
				width: 100,
				height: 60,
				rotation: 45,
				scaleX: 1,
				scaleY: 1,
			}),
		).toBe(true);
	});

	it("Transformプロパティが欠けている場合はfalseを返す", () => {
		expect(isTransformedRect({ x: 0, y: 0, width: 100, height: 60 })).toBe(
			false,
		);
	});

	it("Rectプロパティが欠けている場合はfalseを返す", () => {
		expect(isTransformedRect({ rotation: 0, scaleX: 1, scaleY: 1 })).toBe(
			false,
		);
	});

	it("widthが負の場合はfalseを返す", () => {
		expect(
			isTransformedRect({
				x: 0,
				y: 0,
				width: -10,
				height: 60,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			}),
		).toBe(false);
	});
});
