import { describe, it, expect } from "vitest";

import { displayOutline } from "../displayOutline";

describe("displayOutline", () => {
	it("has a pointed left tip and a rounded right cap, both at mid-height", () => {
		const points = displayOutline({ width: 100, height: 60 });
		const xs = points.map((p) => p.x);
		const ys = points.map((p) => p.y);

		expect(Math.min(...xs)).toBeCloseTo(-50);
		expect(Math.max(...xs)).toBeCloseTo(50);
		expect(Math.min(...ys)).toBeCloseTo(-30);
		expect(Math.max(...ys)).toBeCloseTo(30);

		// Pointed left tip.
		const leftmost = points.reduce((l, p) => (p.x < l.x ? p : l));
		expect(leftmost.x).toBeCloseTo(-50);
		expect(leftmost.y).toBeCloseTo(0);

		// Rounded right cap reaches its widest at mid-height.
		const rightmost = points.reduce((r, p) => (p.x > r.x ? p : r));
		expect(rightmost.x).toBeCloseTo(50);
		expect(rightmost.y).toBeCloseTo(0);
	});
});
