import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/text/style/textSlotId";
import type { Dimensions } from "@jiscribe/geometry";
import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../../states/objects/base/TextStyleState";
import { calcFullTextRegion, calcTextRegion } from "../calcTextRegion";

type TextRegionState = ObjectState &
	Dimensions &
	Pick<TextStyleState, "textVerticalBasis">;

const makeState = (
	width: number,
	height: number,
	textVerticalBasis?: TextStyleState["textVerticalBasis"],
): TextRegionState =>
	({
		id: "obj-1",
		type: "rect",
		width,
		height,
		...(textVerticalBasis === undefined ? {} : { textVerticalBasis }),
	}) as unknown as TextRegionState;

/** A cylinder's region: clear of its top cap and its bottom bulge, so vertically off-centre. */
const cylinderRegion = ({ width, height }: Dimensions) => ({
	x: -width / 2,
	y: -height / 2 + height * 0.24,
	width,
	height: height - height * 0.36,
});

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
		const calculator = (state: Dimensions, slotId: string) =>
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

	it("places the body on the declared region when the state names no basis", () => {
		expect(
			calcTextRegion(makeState(100, 100), BODY_TEXT_SLOT_ID, cylinderRegion),
		).toEqual({ x: -50, y: -26, width: 100, height: 64 });
	});

	it("places the body on the whole height for the frame basis, keeping the region's width", () => {
		expect(
			calcTextRegion(
				makeState(100, 100, "frame"),
				BODY_TEXT_SLOT_ID,
				cylinderRegion,
			),
		).toEqual({ x: -50, y: -50, width: 100, height: 100 });
	});

	it("leaves a type whose region is the whole box untouched by the frame basis", () => {
		expect(
			calcTextRegion(makeState(100, 60, "frame"), BODY_TEXT_SLOT_ID, undefined),
		).toEqual(calcTextRegion(makeState(100, 60), BODY_TEXT_SLOT_ID, undefined));
	});
});

describe("calcFullTextRegion", () => {
	it("is the box itself, which is what a type registering no calculator gets", () => {
		expect(calcFullTextRegion(makeState(100, 60))).toEqual(
			calcTextRegion(makeState(100, 60), BODY_TEXT_SLOT_ID, undefined),
		);
	});
});
