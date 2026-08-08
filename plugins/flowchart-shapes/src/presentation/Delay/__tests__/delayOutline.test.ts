import { describe, it, expect } from "vitest";

import { delayOutline } from "../delayOutline";

describe("delayOutline", () => {
	it("bulges into a right semicircle reaching (halfWidth, 0)", () => {
		const points = delayOutline({ width: 100, height: 60 });
		const xs = points.map((p) => p.x);
		const ys = points.map((p) => p.y);

		expect(Math.min(...xs)).toBeCloseTo(-50);
		expect(Math.max(...xs)).toBeCloseTo(50);
		expect(Math.min(...ys)).toBeCloseTo(-30);
		expect(Math.max(...ys)).toBeCloseTo(30);

		// The semicircle's rightmost point sits at mid-height.
		const rightmost = points.reduce((r, p) => (p.x > r.x ? p : r));
		expect(rightmost.x).toBeCloseTo(50);
		expect(rightmost.y).toBeCloseTo(0);
	});
});
