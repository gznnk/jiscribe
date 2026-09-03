import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { calcScrollBounds } from "../calcScrollBounds";

/** Axis-aligned rect: its box is left=cx-w/2, top=cy-h/2, … */
const rect = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const objects: Record<string, ObjectState> = {
	a: rect("a", 0, 0),
	b: rect("b", 200, 200),
};

/** The uniform padding a host's `scrollBounds` resolves to. */
const uniform = (value: number) => ({
	top: value,
	right: value,
	bottom: value,
	left: value,
});

describe("calcScrollBounds", () => {
	it("is unrestricted without a wall", () => {
		expect(calcScrollBounds(null, objects)).toBeNull();
	});

	it("is unrestricted when there is no content to bound it to", () => {
		expect(calcScrollBounds(uniform(100), {})).toBeNull();
	});

	it("grows the content extent by a uniform padding", () => {
		expect(calcScrollBounds(uniform(100), objects)).toEqual({
			left: -150,
			top: -150,
			right: 350,
			bottom: 350,
		});
	});

	it("puts the wall on the content edge at padding 0", () => {
		expect(calcScrollBounds(uniform(0), objects)).toEqual({
			left: -50,
			top: -50,
			right: 250,
			bottom: 250,
		});
	});

	it("grows each side by its own padding", () => {
		expect(
			calcScrollBounds({ top: 32, right: 64, bottom: 24, left: 16 }, objects),
		).toEqual({
			left: -66,
			top: -82,
			right: 314,
			bottom: 274,
		});
	});
});
