import { describe, it, expect } from "vitest";

import { calcEllipseTextRegion } from "../calcEllipseTextRegion";

/** Any family: these calculators derive their region from the box and read no context. */
const TEXT_REGION_CONTEXT = { fontFamily: "sans-serif" };

describe("calcEllipseTextRegion", () => {
	it("returns the w/√2 × h/√2 region inscribed in the ellipse", () => {
		const result = calcEllipseTextRegion(
			{ width: 100, height: 60 },
			"body",
			TEXT_REGION_CONTEXT,
		);
		expect(result.width).toBeCloseTo(100 / Math.SQRT2, 6);
		expect(result.height).toBeCloseTo(60 / Math.SQRT2, 6);
		expect(result.x).toBeCloseTo(-100 / Math.SQRT2 / 2, 6);
		expect(result.y).toBeCloseTo(-60 / Math.SQRT2 / 2, 6);
	});
});
