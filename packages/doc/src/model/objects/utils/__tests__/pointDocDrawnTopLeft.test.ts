import { describe, expect, it } from "vitest";

import {
	calcPointDocCenter,
	calcPointDocDrawnTopLeft,
} from "../pointDocDrawnTopLeft";

const SIZE = { width: 80, height: 40 };

describe("calcPointDocDrawnTopLeft", () => {
	it("subtracts the half box for a doc stating no transform", () => {
		expect(calcPointDocDrawnTopLeft({ x: 100, y: 100 }, SIZE, {})).toEqual({
			x: 60,
			y: 80,
		});
	});

	it("puts the corner where the rotation draws it", () => {
		// A quarter turn about the center moves the local top-left corner to where the
		// local bottom-left one was: half the height to the right, half the width up.
		const corner = calcPointDocDrawnTopLeft({ x: 0, y: 0 }, SIZE, {
			rotation: 90,
		});
		expect(corner.x).toBeCloseTo(20, 10);
		expect(corner.y).toBeCloseTo(-40, 10);
	});

	it("puts the corner where the flips draw it", () => {
		expect(
			calcPointDocDrawnTopLeft({ x: 0, y: 0 }, SIZE, {
				flipX: true,
				flipY: true,
			}),
		).toEqual({ x: 40, y: 20 });
	});

	it("reads a rotation that is not a number as no rotation", () => {
		expect(
			calcPointDocDrawnTopLeft({ x: 0, y: 0 }, SIZE, { rotation: "90" }),
		).toEqual({ x: -40, y: -20 });
	});
});

describe("calcPointDocCenter", () => {
	it("is the inverse, rotation and flips included", () => {
		for (const transform of [
			{},
			{ rotation: 37 },
			{ rotation: 90, flipX: true },
			{ flipY: true },
		]) {
			const center = calcPointDocCenter({ x: 12.5, y: -7.25 }, SIZE, transform);
			const corner = calcPointDocDrawnTopLeft(center, SIZE, transform);
			expect(corner.x).toBeCloseTo(12.5, 10);
			expect(corner.y).toBeCloseTo(-7.25, 10);
		}
	});

	it("answers the point itself for a box of no size", () => {
		expect(
			calcPointDocCenter({ x: 5, y: 6 }, { width: 0, height: 0 }, {}),
		).toEqual({ x: 5, y: 6 });
	});
});
