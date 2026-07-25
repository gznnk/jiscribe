import { describe, it, expect } from "vitest";

import { calcOutlinePointTowardForRotatedEllipse } from "../../points/calcOutlinePointTowardForRotatedEllipse";
import type { TransformedEllipse } from "../../types/TransformedEllipse";

const baseEllipse: TransformedEllipse = {
	cx: 0,
	cy: 0,
	rx: 50,
	ry: 30,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

describe("calcOutlinePointTowardForRotatedEllipse", () => {
	it("returns null when toward is inside the ellipse", () => {
		const result = calcOutlinePointTowardForRotatedEllipse(baseEllipse, {
			x: 10,
			y: 5,
		});
		expect(result).toBeNull();
	});

	it("returns null when toward equals the center", () => {
		const result = calcOutlinePointTowardForRotatedEllipse(baseEllipse, {
			x: 0,
			y: 0,
		});
		expect(result).toBeNull();
	});

	it("returns the right-hand intersection for a toward point to the right", () => {
		const result = calcOutlinePointTowardForRotatedEllipse(baseEllipse, {
			x: 200,
			y: 0,
		});
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(50);
		expect(result!.y).toBeCloseTo(0);
	});

	it("returns the top intersection for a toward point above", () => {
		const result = calcOutlinePointTowardForRotatedEllipse(baseEllipse, {
			x: 0,
			y: -200,
		});
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(0);
		expect(result!.y).toBeCloseTo(-30);
	});

	it("returns the correct intersection for a diagonal ray from an off-origin center", () => {
		// Offset (100,60) from center (10,20): normalized distance 8, so the hit is the offset over √8.
		const result = calcOutlinePointTowardForRotatedEllipse(
			{ ...baseEllipse, cx: 10, cy: 20 },
			{ x: 110, y: 80 },
		);
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(10 + 100 / Math.sqrt(8));
		expect(result!.y).toBeCloseTo(20 + 60 / Math.sqrt(8));
	});

	it("hits the rotated edge (ry=30) for a rightward toward when rotated 90 degrees", () => {
		// Rotating rx=50, ry=30 by 90 degrees puts the local ry (30) on the world horizontal edge.
		const result = calcOutlinePointTowardForRotatedEllipse(
			{ ...baseEllipse, rotation: 90 },
			{ x: 200, y: 0 },
		);
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(30);
		expect(result!.y).toBeCloseTo(0);
	});

	it("returns null when rx or ry is 0 or less", () => {
		const result = calcOutlinePointTowardForRotatedEllipse(
			{ ...baseEllipse, rx: 0 },
			{ x: 200, y: 0 },
		);
		expect(result).toBeNull();
	});
});
