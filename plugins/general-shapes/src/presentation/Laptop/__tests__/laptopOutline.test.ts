import { describe, it, expect } from "vitest";

import { laptopOutline } from "../laptopOutline";

describe("laptopOutline", () => {
	it("takes its top edge from the screen, not from the box", () => {
		const points = laptopOutline({ width: 200, height: 100 });
		// screen: 200 * 0.12 = 24 inset each side, 200 * 0.76 = 152 wide
		expect(points).toHaveLength(6);
		expect(points[0]).toEqual({ x: -76, y: -50 });
		expect(points[1]).toEqual({ x: 76, y: -50 });
	});

	it("splays out to the full width only at the base", () => {
		const points = laptopOutline({ width: 200, height: 100 });
		// base top edge = screen bottom = 100 * 0.72 = 72 below the top (-50)
		expect(points[2]).toEqual({ x: 76, y: 22 });
		expect(points[3]).toEqual({ x: 100, y: 50 });
		expect(points[4]).toEqual({ x: -100, y: 50 });
		expect(points[5]).toEqual({ x: -76, y: 22 });
	});

	it("leaves the box's top corners outside the shape", () => {
		const points = laptopOutline({ width: 200, height: 100 });
		const onTopCorner = points.some(
			(point) => point.y === -50 && Math.abs(point.x) === 100,
		);
		expect(onTopCorner).toBe(false);
	});
});
