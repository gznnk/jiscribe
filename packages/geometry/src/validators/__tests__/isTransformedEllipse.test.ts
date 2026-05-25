import { describe, it, expect } from "vitest";

import { isTransformedEllipse } from "../isTransformedEllipse";

describe("isTransformedEllipse", () => {
	it("有効なTransformedEllipseはtrueを返す", () => {
		expect(
			isTransformedEllipse({
				cx: 0,
				cy: 0,
				rx: 50,
				ry: 30,
				rotation: 30,
				scaleX: 1,
				scaleY: 1,
			}),
		).toBe(true);
	});

	it("Transformプロパティが欠けている場合はfalseを返す", () => {
		expect(isTransformedEllipse({ cx: 0, cy: 0, rx: 50, ry: 30 })).toBe(false);
	});

	it("Ellipseプロパティが欠けている場合はfalseを返す", () => {
		expect(isTransformedEllipse({ rotation: 0, scaleX: 1, scaleY: 1 })).toBe(
			false,
		);
	});

	it("rxが負の場合はfalseを返す", () => {
		expect(
			isTransformedEllipse({
				cx: 0,
				cy: 0,
				rx: -1,
				ry: 30,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			}),
		).toBe(false);
	});
});
