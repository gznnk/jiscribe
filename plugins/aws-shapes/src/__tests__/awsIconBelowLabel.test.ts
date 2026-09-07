import {
	calcBelowLabelTextRegion,
	calcBelowLabelVisualBounds,
} from "@jiscribe/canvas-sdk";
import { calcOutsideBoxTextRegion } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { awsIconDefinition } from "../definition";
import { awsIconDocDefinition } from "../doc";

// A below-label works only with all three pieces in place (as canvas-sdk's
// index.ts says): the UI's textRegion, its visualBounds, and BelowLabelHitArea
// in the drawing. Swap any one of them for something other than what actor /
// server use and the label quietly gets cropped, becomes ungrabbable, or sits
// somewhere other than its editor. This pins them against that.
describe("awsIcon's below-label", () => {
	it("registers the same region calculators actor / server do", () => {
		expect(awsIconDefinition.textRegion).toBe(calcBelowLabelTextRegion);
		expect(awsIconDefinition.visualBounds).toBe(calcBelowLabelVisualBounds);
	});

	it('answers "outside the box" on the doc side, so the parser sizes no height', () => {
		expect(awsIconDocDefinition.textRegion).toBe(calcOutsideBoxTextRegion);
	});

	it("puts the label under the box", () => {
		const state = {
			width: 64,
			height: 64,
			text: { body: { text: "Lambda" } },
		};
		const region = calcBelowLabelTextRegion(state, "body");
		expect(region.y).toBeGreaterThanOrEqual(state.height / 2);
	});

	it("does not widen what is painted while the label is empty", () => {
		const state = { width: 64, height: 64, text: { body: { text: "" } } };
		expect(calcBelowLabelVisualBounds(state)).toEqual({
			x: -32,
			y: -32,
			width: 64,
			height: 64,
		});
	});
});
