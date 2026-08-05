import { describe, it, expect } from "vitest";

import { shieldOutline } from "../shieldOutline";

describe("shieldOutline", () => {
	it("starts with the flat top edge and the straight flanks down to the shoulders", () => {
		const points = shieldOutline({ width: 100, height: 200 });
		// shoulder = 200 * 0.45 = 90 below the top edge (-100)
		expect(points[0]).toEqual({ x: -50, y: -100 });
		expect(points[1]).toEqual({ x: 50, y: -100 });
		expect(points[2]).toEqual({ x: 50, y: -10 });
	});

	it("reaches the tip at the bottom center and returns to the left shoulder", () => {
		const points = shieldOutline({ width: 100, height: 200 });
		const tip = points.find((point) => point.y > 99);
		expect(tip?.x).toBeCloseTo(0);
		const last = points[points.length - 1];
		expect(last.x).toBeCloseTo(-50);
		expect(last.y).toBeCloseTo(-10);
	});

	it("stays inside the bounding box the whole way round", () => {
		const points = shieldOutline({ width: 100, height: 200 });
		for (const point of points) {
			expect(Math.abs(point.x)).toBeLessThanOrEqual(50.0001);
			expect(Math.abs(point.y)).toBeLessThanOrEqual(100.0001);
		}
	});
});
