import { describe, it, expect } from "vitest";

import { packageOutline } from "../packageOutline";

describe("packageOutline", () => {
	it("is the hexagon, apex and tip on the vertical center line", () => {
		const points = packageOutline({ width: 100, height: 200 });
		expect(points).toHaveLength(6);
		// shoulder = 200 * 0.26 = 52 below the top edge (-100)
		expect(points[0]).toEqual({ x: 0, y: -100 });
		expect(points[1]).toEqual({ x: 50, y: -48 });
		expect(points[3]).toEqual({ x: 0, y: 100 });
	});

	it("leaves every corner of the bounding box outside the silhouette", () => {
		const points = packageOutline({ width: 100, height: 100 });
		const onCorner = points.some(
			(point) => Math.abs(point.x) === 50 && Math.abs(point.y) === 50,
		);
		expect(onCorner).toBe(false);
	});
});
