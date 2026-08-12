import type { Point } from "@jiscribe/geometry";
import { describe, it, expect } from "vitest";

import { calcPinchDist } from "../calcPinchDist";

/** The recognizer's pointerId -> client position map for the two active touches. */
const touches = (a: Point, b: Point): Map<number, Point> =>
	new Map([
		[1, a],
		[2, b],
	]);

describe("calcPinchDist", () => {
	it("measures the straight-line gap between the two touches", () => {
		expect(calcPinchDist(touches({ x: 0, y: 0 }, { x: 3, y: 4 }))).toBeCloseTo(
			5,
		);
	});

	it("is zero when both touches sit on the same point", () => {
		expect(calcPinchDist(touches({ x: 20, y: 20 }, { x: 20, y: 20 }))).toBe(0);
	});

	it("does not depend on which touch is listed first", () => {
		const a = { x: -30, y: 10 };
		const b = { x: 50, y: -40 };
		expect(calcPinchDist(touches(a, b))).toBeCloseTo(
			calcPinchDist(touches(b, a)),
		);
	});

	it("grows as the touches spread apart, which is what drives the zoom ratio", () => {
		const start = calcPinchDist(
			touches({ x: 100, y: 100 }, { x: 200, y: 100 }),
		);
		const spread = calcPinchDist(
			touches({ x: 100, y: 100 }, { x: 300, y: 100 }),
		);
		expect(spread / start).toBeCloseTo(2);
	});
});
