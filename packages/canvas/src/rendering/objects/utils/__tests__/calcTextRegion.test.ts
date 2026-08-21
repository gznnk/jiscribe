import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/text/textSlotId";
import type { Dimensions } from "@jiscribe/geometry";
import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { calcFullTextRegion, calcTextRegion } from "../calcTextRegion";

const makeState = (width: number, height: number): ObjectState & Dimensions =>
	({ id: "obj-1", type: "rect", width, height }) as unknown as ObjectState &
		Dimensions;

describe("calcTextRegion", () => {
	it("returns the whole bbox in center-origin local coordinates when no calculator is registered", () => {
		const result = calcTextRegion(
			makeState(100, 60),
			BODY_TEXT_SLOT_ID,
			undefined,
		);
		expect(result).toEqual({ x: -50, y: -30, width: 100, height: 60 });
	});

	it("returns the calculator result when one is given", () => {
		const result = calcTextRegion(
			makeState(100, 60),
			BODY_TEXT_SLOT_ID,
			({ width }) => ({
				x: 0,
				y: 0,
				width: width / 2,
				height: 10,
			}),
		);
		expect(result).toEqual({ x: 0, y: 0, width: 50, height: 10 });
	});

	it("passes slotId through to the calculator so it can return a region per compartment", () => {
		const calculator = (state: ObjectState & Dimensions, slotId: string) =>
			slotId === "header"
				? { x: 0, y: 0, width: state.width, height: 20 }
				: { x: 0, y: 20, width: state.width, height: state.height - 20 };

		expect(calcTextRegion(makeState(100, 60), "header", calculator)).toEqual({
			x: 0,
			y: 0,
			width: 100,
			height: 20,
		});
		expect(calcTextRegion(makeState(100, 60), "rows", calculator)).toEqual({
			x: 0,
			y: 20,
			width: 100,
			height: 40,
		});
	});
});

describe("calcFullTextRegion", () => {
	it("is the box itself, which is what a type registering no calculator gets", () => {
		expect(calcFullTextRegion(makeState(100, 60))).toEqual(
			calcTextRegion(makeState(100, 60), BODY_TEXT_SLOT_ID, undefined),
		);
	});
});
