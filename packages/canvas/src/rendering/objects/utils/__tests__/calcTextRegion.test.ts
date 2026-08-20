import type { Dimensions } from "@jiscribe/geometry";
import { describe, it, expect } from "vitest";

import { BODY_TEXT_SLOT_ID } from "../../../../constants/textSlotId";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { calcFullTextRegion, calcTextRegion } from "../calcTextRegion";

const makeState = (width: number, height: number): ObjectState & Dimensions =>
	({ id: "obj-1", type: "rect", width, height }) as unknown as ObjectState &
		Dimensions;

/** The drawing context, whose family only a calculator sizing a region from its own text reads. */
const CONTEXT = { fontFamily: "sans-serif" };

describe("calcTextRegion", () => {
	it("returns the whole bbox in center-origin local coordinates when no calculator is registered", () => {
		const result = calcTextRegion(
			makeState(100, 60),
			BODY_TEXT_SLOT_ID,
			undefined,
			CONTEXT,
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
			CONTEXT,
		);
		expect(result).toEqual({ x: 0, y: 0, width: 50, height: 10 });
	});

	it("passes slotId through to the calculator so it can return a region per compartment", () => {
		const calculator = (state: ObjectState & Dimensions, slotId: string) =>
			slotId === "header"
				? { x: 0, y: 0, width: state.width, height: 20 }
				: { x: 0, y: 20, width: state.width, height: state.height - 20 };

		expect(
			calcTextRegion(makeState(100, 60), "header", calculator, CONTEXT),
		).toEqual({
			x: 0,
			y: 0,
			width: 100,
			height: 20,
		});
		expect(
			calcTextRegion(makeState(100, 60), "rows", calculator, CONTEXT),
		).toEqual({
			x: 0,
			y: 20,
			width: 100,
			height: 40,
		});
	});

	it("hands the drawing context to the calculator, so a label is measured with the family it is drawn in", () => {
		// The whole of #1: a region sized from its own text has to know the family
		// the overlay falls back to, which lives on the theme rather than the doc.
		const seen: string[] = [];
		const calculator = (
			state: ObjectState & Dimensions,
			_slotId: string,
			context: { fontFamily: string },
		) => {
			seen.push(context.fontFamily);
			return { x: 0, y: 0, width: state.width, height: 10 };
		};

		calcTextRegion(makeState(100, 60), BODY_TEXT_SLOT_ID, calculator, {
			fontFamily: "Some Host Family",
		});

		expect(seen).toEqual(["Some Host Family"]);
	});
});

describe("calcFullTextRegion", () => {
	it("is the box itself, which is what a type registering no calculator gets", () => {
		expect(calcFullTextRegion(makeState(100, 60))).toEqual(
			calcTextRegion(makeState(100, 60), BODY_TEXT_SLOT_ID, undefined, CONTEXT),
		);
	});
});
