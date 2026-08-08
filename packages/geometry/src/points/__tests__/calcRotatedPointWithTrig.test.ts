import { describe, it, expect } from "vitest";

import { calcRotatedPointWithTrig } from "../calcRotatedPointWithTrig";

describe("calcRotatedPointWithTrig", () => {
	it("returns the point unchanged for cos=1, sin=0 (no rotation)", () => {
		const result = calcRotatedPointWithTrig(1, 0, 0, 0, 1, 0);
		expect(result.x).toBeCloseTo(1);
		expect(result.y).toBeCloseTo(0);
	});

	it("rotates 90 degrees (cos=0, sin=1) about the origin", () => {
		// (1, 0) rotated 90 degrees about the origin -> (0, 1)
		const result = calcRotatedPointWithTrig(1, 0, 0, 0, 0, 1);
		expect(result.x).toBeCloseTo(0);
		expect(result.y).toBeCloseTo(1);
	});

	it("rotates about an arbitrary center", () => {
		// (2, 0) rotated 90 degrees about (1, 0) -> (1, 1)
		const result = calcRotatedPointWithTrig(2, 0, 1, 0, 0, 1);
		expect(result.x).toBeCloseTo(1);
		expect(result.y).toBeCloseTo(1);
	});

	it("reverses the rotation when sin is negated, since cos(-θ)=cos and sin(-θ)=-sin", () => {
		const angleRad = Math.PI / 3;
		const cos = Math.cos(angleRad);
		const sin = Math.sin(angleRad);
		// Rotating by +θ then by -θ (negated sin) returns the original point.
		const rotated = calcRotatedPointWithTrig(3, 2, 1, 1, cos, sin);
		const restored = calcRotatedPointWithTrig(
			rotated.x,
			rotated.y,
			1,
			1,
			cos,
			-sin,
		);
		expect(restored.x).toBeCloseTo(3);
		expect(restored.y).toBeCloseTo(2);
	});
});
