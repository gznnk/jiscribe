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

describe("calcScrollBounds", () => {
	it("is unrestricted without a setting", () => {
		expect(calcScrollBounds(undefined, objects)).toBeNull();
	});

	it("is unrestricted in infinite mode", () => {
		expect(calcScrollBounds({ mode: "infinite" }, objects)).toBeNull();
	});

	it("is unrestricted when there is no content to bound it to", () => {
		expect(calcScrollBounds({ mode: "content" }, {})).toBeNull();
	});

	it("pads the content extent by 100 world units by default", () => {
		expect(calcScrollBounds({ mode: "content" }, objects)).toEqual({
			left: -150,
			top: -150,
			right: 350,
			bottom: 350,
		});
	});

	it("puts the wall on the content edge at padding 0", () => {
		expect(calcScrollBounds({ mode: "content", padding: 0 }, objects)).toEqual({
			left: -50,
			top: -50,
			right: 250,
			bottom: 250,
		});
	});
});
