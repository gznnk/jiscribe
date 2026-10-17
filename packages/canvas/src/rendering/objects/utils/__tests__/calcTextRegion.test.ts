import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import type { Dimensions, Rect } from "@jiscribe/geometry";
import { describe, it, expect, vi } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../../states/objects/base/TextStyleState";
import type { ObjectPartKindDefinition } from "../../registry/ObjectPartKindRegistry";
import {
	calcFullTextRegion,
	calcTextRegion,
	calcTextSlotRegions,
} from "../calcTextRegion";

type TextRegionState = ObjectState &
	Dimensions &
	Pick<TextStyleState, "textVerticalBasis" | "text">;

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

/** A two-slot shape (a title over rows), as a `features.text: "slots"` type holds it. */
const makeSlotsState = (
	width: number,
	height: number,
	textVerticalBasis?: TextStyleState["textVerticalBasis"],
): TextRegionState => ({
	...makeState(width, height, textVerticalBasis),
	type: "record",
	text: { header: { text: "User" }, rows: { text: ["id"] } },
});

const HEADER_REGION: Rect = { x: 0, y: 0, width: 100, height: 20 };
const ROWS_REGION: Rect = { x: 0, y: 20, width: 100, height: 40 };

/**
 * A registered kind stands in here as the bare pair of answers: the readers take
 * what the kind says (placeTextSlotRegions has already placed it), so whatever
 * `region` / `regions` return is what comes out.
 */
const textSlotKindAnswering = (
	answers: Pick<ObjectPartKindDefinition, "region" | "regions">,
): ObjectPartKindDefinition => ({
	kind: "textSlot",
	has: () => true,
	...answers,
});

describe("calcTextRegion", () => {
	it("answers the kind's region for the slot", () => {
		const region = vi.fn((_object: ObjectState, partId: string) =>
			partId === "rows" ? ROWS_REGION : HEADER_REGION,
		);
		expect(
			calcTextRegion(
				makeSlotsState(100, 60),
				"rows",
				textSlotKindAnswering({ region }),
			),
		).toEqual(ROWS_REGION);
		expect(region).toHaveBeenCalledWith(makeSlotsState(100, 60), "rows");
	});

	it("returns the whole bbox in center-origin local coordinates when no kind is registered", () => {
		expect(
			calcTextRegion(makeState(100, 60), BODY_TEXT_SLOT_ID, undefined),
		).toEqual({ x: -50, y: -30, width: 100, height: 60 });
	});

	it("falls back to the whole bbox where the kind answers null", () => {
		expect(
			calcTextRegion(
				makeSlotsState(100, 60),
				"operations",
				textSlotKindAnswering({ region: () => null }),
			),
		).toEqual({ x: -50, y: -30, width: 100, height: 60 });
	});

	it("puts the fallback on the vertical basis, the box itself being its whole height", () => {
		expect(
			calcTextRegion(makeState(100, 60, "frame"), BODY_TEXT_SLOT_ID, undefined),
		).toEqual(calcTextRegion(makeState(100, 60), BODY_TEXT_SLOT_ID, undefined));
	});
});

describe("calcTextSlotRegions", () => {
	it("asks the kind's regions exactly once for every slot", () => {
		const regions = vi.fn(() => ({
			header: HEADER_REGION,
			rows: ROWS_REGION,
		}));
		const region = vi.fn(() => HEADER_REGION);

		expect(
			calcTextSlotRegions(
				makeSlotsState(100, 60),
				textSlotKindAnswering({ region, regions }),
			),
		).toEqual({ header: HEADER_REGION, rows: ROWS_REGION });
		expect(regions).toHaveBeenCalledTimes(1);
		expect(region).not.toHaveBeenCalled();
	});

	it("asks the kind's region once per slot when it declares no regions", () => {
		const region = vi.fn((_object: ObjectState, partId: string) =>
			partId === "rows" ? ROWS_REGION : HEADER_REGION,
		);

		const textSlotRegions = calcTextSlotRegions(
			makeSlotsState(100, 60),
			textSlotKindAnswering({ region }),
		);

		expect(region).toHaveBeenCalledTimes(2);
		expect(textSlotRegions).toEqual({
			header: HEADER_REGION,
			rows: ROWS_REGION,
		});
	});

	it("gives every slot the full box when no kind is registered", () => {
		expect(calcTextSlotRegions(makeSlotsState(100, 60), undefined)).toEqual({
			header: { x: -50, y: -30, width: 100, height: 60 },
			rows: { x: -50, y: -30, width: 100, height: 60 },
		});
	});

	it("answers nothing for a state holding no text", () => {
		expect(calcTextSlotRegions(makeState(100, 60), undefined)).toEqual({});
	});
});

describe("calcFullTextRegion", () => {
	it("is the box itself, which is what a type placing no slot gets", () => {
		expect(calcFullTextRegion(makeState(100, 60))).toEqual(
			calcTextRegion(makeState(100, 60), BODY_TEXT_SLOT_ID, undefined),
		);
	});
});
