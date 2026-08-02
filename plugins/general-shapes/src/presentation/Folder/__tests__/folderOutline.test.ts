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
});
