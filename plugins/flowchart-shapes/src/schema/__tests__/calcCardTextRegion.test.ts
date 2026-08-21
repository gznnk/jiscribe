import { describe, it, expect } from "vitest";

import { calcCardTextRegion } from "../textRegions";

describe("calcCardTextRegion", () => {
	it("keeps the region below the cut corner at full width, following the aspect ratio", () => {
		// 120x80: cut = min(120,80) * 0.25 = 20, so the top inset is 20/80 = 0.25.
		// With a constant ratio it would spill into the corner notch.
		const result = calcCardTextRegion({ width: 120, height: 80 });
		expect(result).toEqual({ x: -60, y: -20, width: 120, height: 60 });
	});
});
