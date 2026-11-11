import { describe, expect, it } from "vitest";

import { isRectInside } from "../isRectInside";

const outer = { x: 0, y: 0, width: 100, height: 50 };

describe("isRectInside", () => {
	it("counts a box touching or equal to the outer edges as inside", () => {
		expect(isRectInside(outer, outer)).toBe(true);
		expect(isRectInside(outer, { x: 60, y: 20, width: 40, height: 30 })).toBe(
			true,
		);
		expect(isRectInside(outer, { x: 100, y: 50, width: 0, height: 0 })).toBe(
			true,
		);
	});

	it("rejects a box crossing an edge", () => {
		expect(isRectInside(outer, { x: 61, y: 20, width: 40, height: 30 })).toBe(
			false,
		);
		expect(isRectInside(outer, { x: -1, y: 0, width: 10, height: 10 })).toBe(
			false,
		);
	});
});
