import { describe, it, expect } from "vitest";

import { cloudOutline } from "../cloudOutline";

describe("cloudOutline", () => {
	it("samples a bumpy silhouette that fills most of the box without leaving it", () => {
		const points = cloudOutline({ width: 100, height: 80 });
		const xs = points.map((p) => p.x);
		const ys = points.map((p) => p.y);

		// 6 cubic segments sampled → a dense polyline.
		expect(points.length).toBeGreaterThan(60);

		// Every point stays inside the bounding box (controls live in the unit box).
		for (const p of points) {
			expect(p.x).toBeGreaterThanOrEqual(-50 - 1e-6);
			expect(p.x).toBeLessThanOrEqual(50 + 1e-6);
			expect(p.y).toBeGreaterThanOrEqual(-40 - 1e-6);
			expect(p.y).toBeLessThanOrEqual(40 + 1e-6);
		}

		// Non-degenerate: the blob spans most of the box in both axes.
		expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(70);
		expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(50);
	});
});
