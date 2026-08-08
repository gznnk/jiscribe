import { describe, it, expect } from "vitest";

import { multiDocumentOutline } from "../multiDocumentOutline";

describe("multiDocumentOutline", () => {
	// 140x100: offset = min(140,100) * 0.08 = 8, sheets are 124x84,
	// amplitude = 84 * 0.075 = 6.3. Sheet frames (centered):
	// back (-54,-50), middle (-62,-42), front (-70,-34); right edges 70 / 62 / 54;
	// wave baselines (bottom - amplitude) 27.7 / 35.7 / 43.7.
	const points = multiDocumentOutline({ width: 140, height: 100 });

	const hasPoint = (x: number, y: number, tolerance = 1e-6): boolean =>
		points.some(
			(p) => Math.abs(p.x - x) < tolerance && Math.abs(p.y - y) < tolerance,
		);

	it("traces the exact staircase along the back sheets' top-left corners", () => {
		expect(hasPoint(-70, -34)).toBe(true);
		expect(hasPoint(-62, -34)).toBe(true);
		expect(hasPoint(-62, -42)).toBe(true);
		expect(hasPoint(-54, -42)).toBe(true);
		expect(hasPoint(-54, -50)).toBe(true);
		expect(hasPoint(70, -50)).toBe(true);
	});

	it("follows each back sheet's wave curve over its exposed offset on the right side", () => {
		// Back wave starts at its right-edge baseline (70, 27.7).
		expect(hasPoint(70, 27.7)).toBe(true);
		// At x = 62 (one offset in) the wave has dipped along the Bézier:
		// t = 8 / 62, y = 27.7 + 4 * 6.3 * t * (1 - t) ≈ 30.53 — not the flat 27.7.
		expect(hasPoint(62, 30.53, 0.05)).toBe(true);
		// The vertical drop lands on the middle sheet's wave start (62, 35.7).
		expect(hasPoint(62, 35.7)).toBe(true);
		// Same one step further in: middle wave end ≈ (54, 38.53) → front wave start (54, 43.7).
		expect(hasPoint(54, 38.53, 0.05)).toBe(true);
		expect(hasPoint(54, 43.7)).toBe(true);
	});

	it("dips to the bounding-box bottom on the front wave's right half and stays inside the bbox", () => {
		const lowest = points.reduce((lo, p) => (p.y > lo.y ? p : lo));
		expect(lowest.y).toBeCloseTo(50);
		expect(lowest.x).toBeGreaterThan(-70);
		expect(lowest.x).toBeLessThan(54);
		for (const p of points) {
			expect(Math.abs(p.x)).toBeLessThanOrEqual(70 + 1e-6);
			expect(Math.abs(p.y)).toBeLessThanOrEqual(50 + 1e-6);
		}
	});
});
