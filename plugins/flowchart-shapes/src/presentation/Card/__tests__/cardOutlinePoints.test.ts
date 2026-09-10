import { describe, expect, it } from "vitest";

import { CARD_CUT_RATIO } from "../../../schema/card/CardDoc";
import { cardOutlinePoints } from "../buildCardPoints";

/**
 * The corner cut is sized from the shorter side so it stays a 45-degree bevel at
 * any aspect ratio. Sizing it from the width instead is invisible on the default
 * 140x80 box the stencil drops in — the bevel is only wrong once the other side
 * is the short one, where it either runs off the box or shrinks to nothing.
 */
describe("cardOutlinePoints", () => {
	it("cuts the corner at 45 degrees whichever side is shorter", () => {
		for (const [width, height] of [
			[140, 80],
			[80, 400],
			[400, 80],
			[100, 100],
		]) {
			const [afterCut, , , , beforeCut] = cardOutlinePoints(
				-width / 2,
				-height / 2,
				width,
				height,
			);
			const cut = Math.min(width, height) * CARD_CUT_RATIO;
			// The bevel runs from the top edge down the left one; equal legs are
			// what make it 45 degrees, and both are measured from the same corner.
			expect(afterCut.x - -width / 2, `${width}x${height}`).toBeCloseTo(cut, 9);
			expect(beforeCut.y - -height / 2, `${width}x${height}`).toBeCloseTo(
				cut,
				9,
			);
		}
	});

	it("leaves the other three corners square", () => {
		expect(cardOutlinePoints(-70, -40, 140, 80)).toEqual([
			{ x: -50, y: -40 },
			{ x: 70, y: -40 },
			{ x: 70, y: 40 },
			{ x: -70, y: 40 },
			{ x: -70, y: -20 },
		]);
	});
});
