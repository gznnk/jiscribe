import { describe, expect, it } from "vitest";

import { ARROW_OUTLINE_THINNING_SCALE } from "../../base/ArrowStyleDoc";
import {
	calcArrowLineEndWedge,
	calcArrowOutlineWidth,
} from "../arrowOutlineThinning";

describe("calcArrowOutlineWidth", () => {
	it("keeps the outline at the stroke width from the thinning scale up: 1 / arrowScale", () => {
		expect(calcArrowOutlineWidth(1)).toBe(1);
		expect(calcArrowOutlineWidth(4)).toBe(0.25);
		expect(calcArrowOutlineWidth(ARROW_OUTLINE_THINNING_SCALE)).toBe(2);
	});

	it("thins the outline with the head below it, holding 1 / 0.5 in local units", () => {
		expect(ARROW_OUTLINE_THINNING_SCALE).toBe(0.5);
		expect(calcArrowOutlineWidth(0.3)).toBe(2);
		expect(calcArrowOutlineWidth(0.2)).toBe(2);
	});
});

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
