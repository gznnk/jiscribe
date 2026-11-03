import { describe, expect, it } from "vitest";

import { calcArrowLineEndWedge } from "../calcArrowLineEndWedge";

describe("calcArrowLineEndWedge", () => {
	it("spans a thinned OpenArrow from the line's end to its tip, in local units", () => {
		const wedge = calcArrowLineEndWedge("OpenArrow", 0.25);
		// One stroke width short of the tip, the line half a stroke width wide:
		// 1 / 0.25 and 0.5 / 0.25 local units.
		expect(wedge?.inset).toBeCloseTo(4, 9);
		expect(wedge?.lineHalfWidth).toBeCloseTo(2, 9);
	});

	it("is none from the thinning scale up, and for any other mark", () => {
		expect(calcArrowLineEndWedge("OpenArrow", 0.5)).toBeUndefined();
		expect(calcArrowLineEndWedge("OpenArrow", 1)).toBeUndefined();
		expect(calcArrowLineEndWedge("HollowTriangle", 0.3)).toBeUndefined();
		expect(calcArrowLineEndWedge(undefined, 0.3)).toBeUndefined();
	});
});
