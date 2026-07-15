import { describe, it, expect } from "vitest";

import { documentOutline } from "../documentOutline";

describe("documentOutline", () => {
	it("has a wavy bottom: right half dips to the bbox bottom, left half rises back", () => {
		// 100x80: amplitude = 80 * 0.075 = 6, wave baseline y = 40 - 6 = 34.
		const points = documentOutline({ width: 100, height: 80 });
		const xs = points.map((p) => p.x);
		const ys = points.map((p) => p.y);

		expect(points.length).toBeGreaterThan(20);
		expect(Math.min(...xs)).toBeCloseTo(-50);
		expect(Math.max(...xs)).toBeCloseTo(50);
		expect(Math.min(...ys)).toBeCloseTo(-40); // flat top

		// The right half dips down to the bbox bottom (y = 40).
		const lowest = points.reduce((lo, p) => (p.y > lo.y ? p : lo));
		expect(lowest.y).toBeCloseTo(40);
		expect(lowest.x).toBeGreaterThan(0);

		// The left half rises back above the wave baseline (apex ≈ (-25, 28)).
		expect(
			points.some((p) => Math.abs(p.x + 25) < 3 && p.y > 26 && p.y < 32),
		).toBe(true);

		// Never leaves the bounding box.
		for (const p of points) {
			expect(Math.abs(p.x)).toBeLessThanOrEqual(50 + 1e-6);
			expect(Math.abs(p.y)).toBeLessThanOrEqual(40 + 1e-6);
		}
	});
});
