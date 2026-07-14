import { describe, it, expect } from "vitest";

import { dbOutline } from "../dbOutline";

describe("dbOutline", () => {
	it("stays within the bounding box and touches every side", () => {
		const points = dbOutline({ width: 100, height: 80 });
		expect(points.length).toBeGreaterThan(8);
		const xs = points.map((p) => p.x);
		const ys = points.map((p) => p.y);
		expect(Math.min(...xs)).toBeCloseTo(-50);
		expect(Math.max(...xs)).toBeCloseTo(50);
		expect(Math.min(...ys)).toBeCloseTo(-40);
		expect(Math.max(...ys)).toBeCloseTo(40);
		for (const p of points) {
			expect(Math.abs(p.x)).toBeLessThanOrEqual(50 + 1e-6);
			expect(Math.abs(p.y)).toBeLessThanOrEqual(40 + 1e-6);
		}
	});
});
