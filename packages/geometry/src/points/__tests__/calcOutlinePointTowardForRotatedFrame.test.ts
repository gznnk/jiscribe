import { describe, it, expect } from "vitest";

import { calcOutlinePointTowardForRotatedFrame } from "../../points/calcOutlinePointTowardForRotatedFrame";
import type { TransformedFrame } from "../../types/TransformedFrame";

const baseFrame: TransformedFrame = {
	cx: 0,
	cy: 0,
	width: 100,
	height: 60,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

describe("calcOutlinePointTowardForRotatedFrame", () => {
	it("returns null when toward is inside the frame", () => {
		const result = calcOutlinePointTowardForRotatedFrame(baseFrame, {
			x: 10,
			y: 5,
		});
		expect(result).toBeNull();
	});

	it("returns null when toward equals the center", () => {
		const result = calcOutlinePointTowardForRotatedFrame(baseFrame, {
			x: 0,
			y: 0,
		});
		expect(result).toBeNull();
	});

	it("returns the right-edge intersection for a toward point to the right", () => {
		const result = calcOutlinePointTowardForRotatedFrame(baseFrame, {
			x: 200,
			y: 0,
		});
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(50);
		expect(result!.y).toBeCloseTo(0);
	});

	it("returns the top-edge intersection for a toward point above", () => {
		const result = calcOutlinePointTowardForRotatedFrame(baseFrame, {
			x: 0,
			y: -200,
		});
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(0);
		expect(result!.y).toBeCloseTo(-30);
	});

	it("returns the correct intersection for a diagonal ray from an off-origin center", () => {
		// Ray from center (10,20) toward (210,140): direction (200,120) reaches the right edge
		// (x=60) at y=50, exactly on the corner.
		const result = calcOutlinePointTowardForRotatedFrame(
			{ ...baseFrame, cx: 10, cy: 20 },
			{ x: 210, y: 140 },
		);
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(60);
		expect(result!.y).toBeCloseTo(50);
	});

	it("hits the rotated edge (x = half height = 30) for a rightward toward when rotated 90 degrees", () => {
		// Rotating 100x60 by 90 degrees puts the local half height (30) on the world horizontal edge.
		const result = calcOutlinePointTowardForRotatedFrame(
			{ ...baseFrame, rotation: 90 },
			{ x: 200, y: 0 },
		);
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(30);
		expect(result!.y).toBeCloseTo(0);
	});

	it("returns null when width or height is 0 or less", () => {
		const result = calcOutlinePointTowardForRotatedFrame(
			{ ...baseFrame, width: 0 },
			{ x: 200, y: 0 },
		);
		expect(result).toBeNull();
	});
});
