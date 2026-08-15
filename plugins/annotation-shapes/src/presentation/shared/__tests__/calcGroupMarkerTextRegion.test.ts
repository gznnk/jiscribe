import { BODY_TEXT_SLOT_ID } from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import type { GroupMarkerDirection } from "../../../schema/shared/GroupMarkerFields";
import { GROUP_MARKER_LABEL_GAP } from "../../../schema/shared/GroupMarkerFields";
import { calcGroupMarkerTextRegion } from "../calcGroupMarkerTextRegion";
import { calcGroupMarkerVisualBounds } from "../calcGroupMarkerVisualBounds";
import { calcGroupMarkerTip } from "../groupMarkerGeometry";

const stateOf = (
	direction: GroupMarkerDirection,
	text: string,
	width = 24,
	height = 160,
) => ({
	width,
	height,
	direction,
	tipPosition: 0.5,
	text: { [BODY_TEXT_SLOT_ID]: { text } },
});

/** The tip in the same local coordinates the region is returned in. */
const tipOf = (state: ReturnType<typeof stateOf>) =>
	calcGroupMarkerTip(
		-state.width / 2,
		-state.height / 2,
		state.width,
		state.height,
		state.direction,
		state.tipPosition,
	);

describe("calcGroupMarkerTextRegion", () => {
	it("sets the label beyond the tip and centers it there (left)", () => {
		const state = stateOf("left", "doc layer");
		const region = calcGroupMarkerTextRegion(state, BODY_TEXT_SLOT_ID);
		const tip = tipOf(state);
		expect(region.x + region.width).toBe(tip.x - GROUP_MARKER_LABEL_GAP);
		expect(region.y + region.height / 2).toBe(tip.y);
	});

	it("mirrors that for the opposite direction (right)", () => {
		const state = stateOf("right", "doc layer");
		const region = calcGroupMarkerTextRegion(state, BODY_TEXT_SLOT_ID);
		const tip = tipOf(state);
		expect(region.x).toBe(tip.x + GROUP_MARKER_LABEL_GAP);
		expect(region.y + region.height / 2).toBe(tip.y);
	});

	it("hangs the label below the tip for a down marker", () => {
		const state = stateOf("down", "one transaction", 300, 30);
		const region = calcGroupMarkerTextRegion(state, BODY_TEXT_SLOT_ID);
		const tip = tipOf(state);
		expect(region.y).toBe(tip.y + GROUP_MARKER_LABEL_GAP);
		expect(region.x + region.width / 2).toBe(tip.x);
	});

	it("grows with the text rather than with the box", () => {
		const short = calcGroupMarkerTextRegion(
			stateOf("left", "a"),
			BODY_TEXT_SLOT_ID,
		);
		const long = calcGroupMarkerTextRegion(
			stateOf("left", "a".repeat(40)),
			BODY_TEXT_SLOT_ID,
		);
		expect(long.width).toBeGreaterThan(short.width);

		const wideBox = calcGroupMarkerTextRegion(
			stateOf("left", "a", 96, 160),
			BODY_TEXT_SLOT_ID,
		);
		expect(wideBox.width).toBe(short.width);
	});

	it("runs sideways rather than wrapping, however long the label is", () => {
		const oneLine = calcGroupMarkerTextRegion(
			stateOf("left", "a"),
			BODY_TEXT_SLOT_ID,
		);
		const long = calcGroupMarkerTextRegion(
			stateOf("left", "a".repeat(400)),
			BODY_TEXT_SLOT_ID,
		);
		expect(long.width).toBeGreaterThan(240);
		expect(long.height).toBeCloseTo(oneLine.height);
	});

	it("reserves a line per authored newline instead", () => {
		const oneLine = calcGroupMarkerTextRegion(
			stateOf("left", "doc layer"),
			BODY_TEXT_SLOT_ID,
		);
		const twoLines = calcGroupMarkerTextRegion(
			stateOf("left", "doc\nlayer"),
			BODY_TEXT_SLOT_ID,
		);
		expect(twoLines.height).toBeGreaterThan(oneLine.height);
	});

	/**
	 * A marker with no movable tip (the plain bracket) carries no `tipPosition`
	 * at all, and must land on the middle of its span rather than on an end.
	 */
	it("anchors a marker without a tipPosition to the middle of the span", () => {
		const withoutTipPosition = {
			width: 24,
			height: 160,
			direction: "left" as const,
			text: { [BODY_TEXT_SLOT_ID]: { text: "doc layer" } },
		};
		expect(
			calcGroupMarkerTextRegion(withoutTipPosition, BODY_TEXT_SLOT_ID),
		).toEqual(
			calcGroupMarkerTextRegion(
				stateOf("left", "doc layer"),
				BODY_TEXT_SLOT_ID,
			),
		);
	});
});

describe("calcGroupMarkerVisualBounds", () => {
	it("reserves nothing beside the marker while the label is empty", () => {
		expect(calcGroupMarkerVisualBounds(stateOf("left", ""))).toEqual({
			x: -12,
			y: -80,
			width: 24,
			height: 160,
		});
	});

	it("widens towards the tip once the label has text", () => {
		const state = stateOf("left", "doc layer");
		const bounds = calcGroupMarkerVisualBounds(state);
		const region = calcGroupMarkerTextRegion(state, BODY_TEXT_SLOT_ID);
		expect(bounds.x).toBe(region.x);
		// Summed from a measured label width, so the right edge lands on the marker's
		// own edge only to within float error.
		expect(bounds.x + bounds.width).toBeCloseTo(state.width / 2);
	});
});
