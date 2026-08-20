import { describe, it, expect } from "vitest";

import { calcDelayTextRegion } from "../calcDelayTextRegion";

/** Any family: these calculators derive their region from the box and read no context. */
const TEXT_REGION_CONTEXT = { fontFamily: "sans-serif" };

describe("calcDelayTextRegion", () => {
	it("insets the right by the cap radius (height/2), following the aspect ratio", () => {
		// 100x80: r = 40, so the right edge lands on w/2 - r = 10, where the straight side
		// ends. With a constant ratio the right corner would spill out once height > 0.4*width.
		const result = calcDelayTextRegion(
			{ width: 100, height: 80 },
			"body",
			TEXT_REGION_CONTEXT,
		);
		expect(result).toEqual({ x: -50, y: -40, width: 60, height: 80 });
	});
});
