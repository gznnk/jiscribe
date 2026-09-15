import { describe, it, expect } from "vitest";

import { calcLoopLimitTextRegion } from "../textRegions";

describe("calcLoopLimitTextRegion", () => {
	it("keeps the region below the cut corners at full width, following the aspect ratio", () => {
		// 120x80: cut = min(120,80) * 0.25 = 20, so the top inset is 20/80 = 0.25.
		// With a constant ratio it would spill into the corner notches.
		const result = calcLoopLimitTextRegion({ width: 120, height: 80 });
		expect(result).toEqual({ x: -60, y: -20, width: 120, height: 60 });
	});

	it("follows the width once that is the shorter side", () => {
		// 80x400: the cut is 20 again, and the inset 20/400 rather than 0.25 — a
		// region taken from the height alone would start a quarter of the way down.
		const result = calcLoopLimitTextRegion({ width: 80, height: 400 });
		expect(result).toEqual({ x: -40, y: -180, width: 80, height: 380 });
	});
});
