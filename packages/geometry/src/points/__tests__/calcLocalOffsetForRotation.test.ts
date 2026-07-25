import { describe, it, expect } from "vitest";

import {
	calcLocalOffsetForRotation,
	calcWorldPointFromLocalOffset,
} from "../calcLocalOffsetForRotation";

describe("calcLocalOffsetForRotation", () => {
	it("skips the trig when unrotated, taking the world offset as the local offset", () => {
		const offset = calcLocalOffsetForRotation(10, 20, 0, { x: 40, y: 60 });
		expect(offset.isRotated).toBe(false);
		expect(offset.cos).toBe(1);
		expect(offset.sin).toBe(0);
		expect(offset.dx).toBeCloseTo(30);
		expect(offset.dy).toBeCloseTo(40);
	});

	it("rotates the world offset by -90 degrees into local space when rotated 90 degrees", () => {
		// Center (0,0), rotation 90: world (100, 0) becomes (0, -100) in local space.
		const offset = calcLocalOffsetForRotation(0, 0, 90, { x: 100, y: 0 });
		expect(offset.isRotated).toBe(true);
		expect(offset.cos).toBeCloseTo(0);
		expect(offset.sin).toBeCloseTo(1);
		expect(offset.dx).toBeCloseTo(0);
		expect(offset.dy).toBeCloseTo(-100);
	});

	it("measures the offset relative to a center away from the origin", () => {
		const offset = calcLocalOffsetForRotation(5, -3, 0, { x: 12, y: 7 });
		expect(offset.dx).toBeCloseTo(7);
		expect(offset.dy).toBeCloseTo(10);
	});

	it("yields dx and dy of 0 when toward equals the center", () => {
		const offset = calcLocalOffsetForRotation(4, 8, 45, { x: 4, y: 8 });
		expect(offset.dx).toBeCloseTo(0);
		expect(offset.dy).toBeCloseTo(0);
	});
});

describe("calcWorldPointFromLocalOffset", () => {
	it("only translates the local point when unrotated", () => {
		const world = calcWorldPointFromLocalOffset(10, 20, 3, 4, {
			cos: 1,
			sin: 0,
			isRotated: false,
		});
		expect(world.x).toBeCloseTo(13);
		expect(world.y).toBeCloseTo(24);
	});

	it("rotates the local point by +90 degrees back to world space", () => {
		// cos/sin are for rotation 90: local (10, 0) rotates to (0, 10).
		const world = calcWorldPointFromLocalOffset(0, 0, 10, 0, {
			cos: Math.cos(Math.PI / 2),
			sin: Math.sin(Math.PI / 2),
			isRotated: true,
		});
		expect(world.x).toBeCloseTo(0);
		expect(world.y).toBeCloseTo(10);
	});
});

describe("calcLocalOffsetForRotation / calcWorldPointFromLocalOffset round trip", () => {
	it("world -> local -> world returns the original point for any rotation and center", () => {
		const cx = 7;
		const cy = -4;
		const rotation = 37;
		const toward = { x: 123, y: 56 };

		const offset = calcLocalOffsetForRotation(cx, cy, rotation, toward);
		// Mapping the local offset straight back to world space must give toward.
		const restored = calcWorldPointFromLocalOffset(
			cx,
			cy,
			offset.dx,
			offset.dy,
			offset,
		);
		expect(restored.x).toBeCloseTo(toward.x);
		expect(restored.y).toBeCloseTo(toward.y);
	});

	it("round-trips back to the original point when unrotated", () => {
		const offset = calcLocalOffsetForRotation(2, 3, 0, { x: 50, y: -10 });
		const restored = calcWorldPointFromLocalOffset(
			2,
			3,
			offset.dx,
			offset.dy,
			offset,
		);
		expect(restored.x).toBeCloseTo(50);
		expect(restored.y).toBeCloseTo(-10);
	});
});
