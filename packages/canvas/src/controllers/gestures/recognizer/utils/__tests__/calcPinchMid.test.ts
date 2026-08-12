import type { Point } from "@jiscribe/geometry";
import { describe, it, expect } from "vitest";

import { calcPinchMid } from "../calcPinchMid";

/** The recognizer's pointerId -> client position map for the two active touches. */
const touches = (a: Point, b: Point): Map<number, Point> =>
	new Map([
		[1, a],
		[2, b],
	]);

describe("calcPinchMid", () => {
	it("sits halfway between the two touches", () => {
		expect(calcPinchMid(touches({ x: 0, y: 0 }, { x: 100, y: 40 }))).toEqual({
			x: 50,
			y: 20,
		});
	});

	it("is the touch itself when both sit on the same point", () => {
		expect(calcPinchMid(touches({ x: 20, y: 30 }, { x: 20, y: 30 }))).toEqual({
			x: 20,
			y: 30,
		});
	});

	it("does not depend on which touch is listed first", () => {
		const a = { x: -30, y: 10 };
		const b = { x: 50, y: -40 };
		expect(calcPinchMid(touches(a, b))).toEqual(calcPinchMid(touches(b, a)));
	});

	it("handles negative client coordinates without flipping the midpoint", () => {
		expect(
			calcPinchMid(touches({ x: -100, y: -60 }, { x: -20, y: 20 })),
		).toEqual({ x: -60, y: -20 });
	});

	it("follows the touches when the whole pinch is dragged", () => {
		// A two-finger drag moves the anchor the viewport is scaled around.
		expect(calcPinchMid(touches({ x: 10, y: 10 }, { x: 30, y: 30 }))).toEqual({
			x: 20,
			y: 20,
		});
		expect(calcPinchMid(touches({ x: 60, y: 10 }, { x: 80, y: 30 }))).toEqual({
			x: 70,
			y: 20,
		});
	});
});
