import { BODY_TEXT_SLOT_ID } from "@jiscribe/canvas";
import type { TextSlot } from "@jiscribe/canvas/doc";
import { TEXT_LINE_HEIGHT } from "@jiscribe/canvas/unstable-doc";
import { describe, it, expect } from "vitest";

import { BELOW_LABEL_STYLE_DEFAULTS } from "../../schema/belowLabelStyleDefaults";
import {
	BELOW_LABEL_GAP,
	calcBelowLabelTextRegion,
} from "../calcBelowLabelTextRegion";

/**
 * Widths come from the non-browser fallback of measureText (characters ×
 * fontSize × 0.6), which is proportional rather than faithful — so the
 * assertions here are about clamps, monotonicity and placement, never about a
 * pixel-exact width.
 */
const shape = (
	width: number,
	height: number,
	slot?: Partial<TextSlot>,
): { width: number; height: number; text?: Record<string, TextSlot> } => ({
	width,
	height,
	text: slot ? { [BODY_TEXT_SLOT_ID]: { text: "", ...slot } } : undefined,
});

const regionOf = (
	width: number,
	height: number,
	slot?: Partial<TextSlot>,
): ReturnType<typeof calcBelowLabelTextRegion> =>
	calcBelowLabelTextRegion(shape(width, height, slot), BODY_TEXT_SLOT_ID);

/** The label box of a single line at the default font size. */
const singleLineHeight =
	BELOW_LABEL_STYLE_DEFAULTS.fontSize * TEXT_LINE_HEIGHT + 2 * 2;

describe("calcBelowLabelTextRegion", () => {
	it("hangs the label below the box, horizontally centered on the origin", () => {
		const region = regionOf(80, 100, { text: "Customer" });
		expect(region.y).toBeCloseTo(50 + BELOW_LABEL_GAP);
		expect(region.x + region.width / 2).toBeCloseTo(0);
	});

	it("keeps the top of the label at the same gap however tall the box is", () => {
		expect(regionOf(80, 200, { text: "Customer" }).y).toBeCloseTo(
			100 + BELOW_LABEL_GAP,
		);
		expect(regionOf(80, 40, { text: "Customer" }).y).toBeCloseTo(
			20 + BELOW_LABEL_GAP,
		);
	});

	it("keeps the label size independent of the box size", () => {
		const small = regionOf(20, 25, { text: "Customer" });
		const large = regionOf(400, 500, { text: "Customer" });
		expect(small.width).toBeCloseTo(large.width);
		expect(small.height).toBeCloseTo(large.height);
	});

	it("falls back to the minimum width and a single line for an empty label", () => {
		const region = regionOf(80, 100, { text: "" });
		expect(region.width).toBe(16);
		expect(region.height).toBeCloseTo(singleLineHeight);
	});

	it("treats a shape with no slot at all like an empty label", () => {
		expect(regionOf(80, 100)).toEqual(regionOf(80, 100, { text: "" }));
	});

	it("grows with the text until the maximum width, then stops", () => {
		const short = regionOf(80, 100, { text: "ab" });
		const medium = regionOf(80, 100, { text: "abcdefghij" });
		expect(medium.width).toBeGreaterThan(short.width);

		const veryLong = regionOf(80, 100, { text: "a".repeat(500) });
		const evenLonger = regionOf(80, 100, { text: "a".repeat(1000) });
		expect(veryLong.width).toBe(240);
		expect(evenLonger.width).toBe(240);
	});

	it("wraps past the maximum width instead of growing, reserving more height", () => {
		const oneLine = regionOf(80, 100, { text: "short" });
		const wrapped = regionOf(80, 100, { text: "a".repeat(500) });
		expect(wrapped.height).toBeGreaterThan(oneLine.height);
	});

	it("reserves one more line per authored newline", () => {
		const oneLine = regionOf(80, 100, { text: "one" });
		const twoLines = regionOf(80, 100, { text: "one\ntwo" });
		expect(twoLines.height).toBeCloseTo(
			oneLine.height + BELOW_LABEL_STYLE_DEFAULTS.fontSize * TEXT_LINE_HEIGHT,
		);
	});

	it("scales the box with the slot's own font size", () => {
		const small = regionOf(80, 100, { text: "Customer", fontSize: 10 });
		const large = regionOf(80, 100, { text: "Customer", fontSize: 30 });
		expect(large.width).toBeGreaterThan(small.width);
		expect(large.height).toBeGreaterThan(small.height);
	});

	it("stays a valid box for a zero-sized shape rather than collapsing", () => {
		const region = regionOf(0, 0, { text: "Customer" });
		expect(region.y).toBeCloseTo(BELOW_LABEL_GAP);
		expect(region.width).toBeGreaterThan(0);
		expect(region.height).toBeGreaterThan(0);
	});
});
