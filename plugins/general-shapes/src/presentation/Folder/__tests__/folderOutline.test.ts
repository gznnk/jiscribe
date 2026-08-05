import { describe, it, expect } from "vitest";

import { folderOutline } from "../folderOutline";

describe("folderOutline", () => {
	it("steps down from the tab to the body along the tab's slanted edge", () => {
		const points = folderOutline({ width: 200, height: 100 });
		// tab: 100 * 0.18 = 18 tall, 200 * 0.4 = 80 wide, slope 18 * 0.7 = 12.6
		expect(points).toHaveLength(6);
		expect(points[0]).toEqual({ x: -100, y: -50 });
		expect(points[1]).toEqual({ x: -20, y: -50 });
		expect(points[2]).toEqual({ x: -7.4, y: -32 });
		expect(points[3]).toEqual({ x: 100, y: -32 });
	});

	it("keeps the body's bottom edge on the bounding box", () => {
		const points = folderOutline({ width: 200, height: 100 });
		expect(points[4]).toEqual({ x: 100, y: 50 });
		expect(points[5]).toEqual({ x: -100, y: 50 });
	});

	it("takes the slant's run off the shorter side, so a tall box cannot push it out", () => {
		// 1:6. Off the height the run would be 600 * 0.18 * 0.7 = 75.6, putting the
		// slant's foot at -50 + 40 + 75.6 = 65.6 — 15.6px past the right edge.
		const points = folderOutline({ width: 100, height: 600 });
		// tab: 600 * 0.18 = 108 tall, 100 * 0.4 = 40 wide, run 100 * 0.18 * 0.7 = 12.6
		expect(points[1]).toEqual({ x: -10, y: -300 });
		expect(points[2].x).toBeCloseTo(2.6);
		expect(points[2].y).toBe(-192);
		expect(Math.max(...points.map((point) => point.x))).toBe(50);
	});
});
