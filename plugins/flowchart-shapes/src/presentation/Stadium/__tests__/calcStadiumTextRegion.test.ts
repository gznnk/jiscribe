import { describe, it, expect } from "vitest";

import { calcStadiumTextRegion } from "../calcStadiumTextRegion";

/** Any family: these calculators derive their region from the box and read no context. */
const TEXT_REGION_CONTEXT = { fontFamily: "sans-serif" };

describe("calcStadiumTextRegion", () => {
	it("insets left and right by the cap radius (half the short side) when landscape", () => {
		const result = calcStadiumTextRegion(
			{ width: 200, height: 80 },
			"body",
			TEXT_REGION_CONTEXT,
		);
		expect(result).toEqual({ x: -60, y: -40, width: 120, height: 80 });
	});

	it("insets top and bottom by the cap radius when portrait", () => {
		const result = calcStadiumTextRegion(
			{ width: 40, height: 200 },
			"body",
			TEXT_REGION_CONTEXT,
		);
		expect(result).toEqual({ x: -20, y: -80, width: 40, height: 160 });
	});
});
