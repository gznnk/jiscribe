import { BODY_TEXT_SLOT_ID } from "@workspace/canvas";
import { describe, expect, it } from "vitest";

import type { BraceDirection } from "../../../schema/brace/BraceDoc";
import { BRACE_LABEL_GAP } from "../../../schema/brace/BraceDoc";
import { calcBraceTip } from "../braceGeometry";
import { calcBraceTextRegion } from "../calcBraceTextRegion";
import { calcBraceVisualBounds } from "../calcBraceVisualBounds";

const stateOf = (
	direction: BraceDirection,
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
	calcBraceTip(
		-state.width / 2,
		-state.height / 2,
		state.width,
		state.height,
		state.direction,
		state.tipPosition,
	);

describe("calcBraceTextRegion", () => {
	it("sets the label beyond the tip and centers it there (left)", () => {
		const state = stateOf("left", "doc 層");
		const region = calcBraceTextRegion(state, BODY_TEXT_SLOT_ID);
		const tip = tipOf(state);
		expect(region.x + region.width).toBe(tip.x - BRACE_LABEL_GAP);
		expect(region.y + region.height / 2).toBe(tip.y);
	});

	it("mirrors that for the opposite direction (right)", () => {
		const state = stateOf("right", "doc 層");
		const region = calcBraceTextRegion(state, BODY_TEXT_SLOT_ID);
		const tip = tipOf(state);
		expect(region.x).toBe(tip.x + BRACE_LABEL_GAP);
		expect(region.y + region.height / 2).toBe(tip.y);
	});

	it("hangs the label below the tip for a down brace", () => {
		const state = stateOf("down", "1 トランザクション", 300, 30);
		const region = calcBraceTextRegion(state, BODY_TEXT_SLOT_ID);
		const tip = tipOf(state);
		expect(region.y).toBe(tip.y + BRACE_LABEL_GAP);
		expect(region.x + region.width / 2).toBe(tip.x);
	});

	it("grows with the text rather than with the box", () => {
		const short = calcBraceTextRegion(stateOf("left", "a"), BODY_TEXT_SLOT_ID);
		const long = calcBraceTextRegion(
			stateOf("left", "a".repeat(40)),
			BODY_TEXT_SLOT_ID,
		);
		expect(long.width).toBeGreaterThan(short.width);

		const wideBox = calcBraceTextRegion(
			stateOf("left", "a", 96, 160),
			BODY_TEXT_SLOT_ID,
		);
		expect(wideBox.width).toBe(short.width);
	});

	it("wraps instead of growing past the max width", () => {
		const wrapped = calcBraceTextRegion(
			stateOf("left", "a".repeat(400)),
			BODY_TEXT_SLOT_ID,
		);
		expect(wrapped.width).toBe(240);
		expect(wrapped.height).toBeGreaterThan(
			calcBraceTextRegion(stateOf("left", "a"), BODY_TEXT_SLOT_ID).height,
		);
	});
});

describe("calcBraceVisualBounds", () => {
	it("reserves nothing beside the bracket while the label is empty", () => {
		expect(calcBraceVisualBounds(stateOf("left", ""))).toEqual({
			x: -12,
			y: -80,
			width: 24,
			height: 160,
		});
	});

	it("widens towards the tip once the label has text", () => {
		const state = stateOf("left", "doc 層");
		const bounds = calcBraceVisualBounds(state);
		const region = calcBraceTextRegion(state, BODY_TEXT_SLOT_ID);
		expect(bounds.x).toBe(region.x);
		expect(bounds.x + bounds.width).toBe(state.width / 2);
	});
});
