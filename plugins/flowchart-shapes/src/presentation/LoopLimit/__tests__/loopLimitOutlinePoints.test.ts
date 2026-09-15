import { describe, expect, it } from "vitest";

import { LOOP_LIMIT_CUT_RATIO } from "../../../schema/loopLimit/LoopLimitDoc";
import { loopLimitOutlinePoints } from "../buildLoopLimitPoints";

/**
 * Both top corners are cut from the shorter side so they stay 45-degree bevels
 * at any aspect ratio. Sizing them from the width instead is invisible on the
 * default 140x80 box the stencil drops in: the bevels only go wrong once the
 * other side is the short one, where they run past the bottom edge, or meet in
 * the middle and swallow the top edge between them.
 */
describe("loopLimitOutlinePoints", () => {
	it("cuts both corners at 45 degrees whichever side is shorter", () => {
		for (const [width, height] of [
			[140, 80],
			[80, 400],
			[400, 80],
			[100, 100],
		]) {
			const [afterLeftCut, beforeRightCut, afterRightCut, , , beforeLeftCut] =
				loopLimitOutlinePoints(-width / 2, -height / 2, width, height);
			const cut = Math.min(width, height) * LOOP_LIMIT_CUT_RATIO;
			const where = `${width}x${height}`;
			expect(afterLeftCut.x - -width / 2, where).toBeCloseTo(cut, 9);
			expect(beforeLeftCut.y - -height / 2, where).toBeCloseTo(cut, 9);
			expect(width / 2 - beforeRightCut.x, where).toBeCloseTo(cut, 9);
			expect(afterRightCut.y - -height / 2, where).toBeCloseTo(cut, 9);
			// The two bevels leave a top edge between them rather than meeting.
			expect(beforeRightCut.x, where).toBeGreaterThan(afterLeftCut.x);
		}
	});

	it("leaves the bottom corners square", () => {
		expect(loopLimitOutlinePoints(-70, -40, 140, 80)).toEqual([
			{ x: -50, y: -40 },
			{ x: 50, y: -40 },
			{ x: 70, y: -20 },
			{ x: 70, y: 40 },
			{ x: -70, y: 40 },
			{ x: -70, y: -20 },
		]);
	});
});
