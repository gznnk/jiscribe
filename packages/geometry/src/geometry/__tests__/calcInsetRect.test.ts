import { describe, it, expect } from "vitest";

import { calcInsetRect } from "../../geometry/calcInsetRect";

describe("calcInsetRect", () => {
	it("returns the whole frame as a Rect when no inset is given", () => {
		const result = calcInsetRect({ cx: 0, cy: 0, width: 100, height: 60 }, {});
		expect(result).toEqual({ x: -50, y: -30, width: 100, height: 60 });
	});

	it("shrinks only the top edge when only top is given", () => {
		const result = calcInsetRect(
			{ cx: 0, cy: 0, width: 100, height: 60 },
			{ top: 0.25 },
		);
		expect(result).toEqual({ x: -50, y: -15, width: 100, height: 45 });
	});

	it("applies insets on all four edges", () => {
		const result = calcInsetRect(
			{ cx: 0, cy: 0, width: 100, height: 100 },
			{ top: 0.1, right: 0.2, bottom: 0.3, left: 0.4 },
		);
		expect(result).toEqual({ x: -10, y: -40, width: 40, height: 60 });
	});

	it("handles a frame centered away from the origin", () => {
		const result = calcInsetRect(
			{ cx: 200, cy: 100, width: 80, height: 40 },
			{ left: 0.5 },
		);
		expect(result).toEqual({ x: 200, y: 80, width: 40, height: 40 });
	});

	it("clamps width and height to 0 when the insets sum above 1", () => {
		const result = calcInsetRect(
			{ cx: 0, cy: 0, width: 100, height: 60 },
			{ top: 0.7, bottom: 0.7 },
		);
		expect(result.height).toBe(0);
		expect(result.width).toBe(100);
	});

	it("follows the frame size, since the insets are ratios", () => {
		const small = calcInsetRect(
			{ cx: 0, cy: 0, width: 100, height: 100 },
			{ top: 0.2 },
		);
		const large = calcInsetRect(
			{ cx: 0, cy: 0, width: 200, height: 200 },
			{ top: 0.2 },
		);
		expect(small.height).toBe(80);
		expect(large.height).toBe(160);
	});
});
