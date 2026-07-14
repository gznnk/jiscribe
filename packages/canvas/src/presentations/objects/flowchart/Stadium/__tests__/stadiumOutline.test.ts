import { describe, it, expect } from "vitest";

import { stadiumOutline } from "../stadiumOutline";

describe("stadiumOutline", () => {
	it("caps reach the bounding-box extremes", () => {
		const points = stadiumOutline({ width: 120, height: 60 });
		const xs = points.map((p) => p.x);
		const ys = points.map((p) => p.y);
		expect(Math.min(...xs)).toBeCloseTo(-60);
		expect(Math.max(...xs)).toBeCloseTo(60);
		expect(Math.min(...ys)).toBeCloseTo(-30);
		expect(Math.max(...ys)).toBeCloseTo(30);
	});
});
