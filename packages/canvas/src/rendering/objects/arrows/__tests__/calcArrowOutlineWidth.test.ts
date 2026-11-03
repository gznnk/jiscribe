import { ARROW_OUTLINE_THINNING_SCALE } from "@jiscribe/doc/model/objects/base/ArrowStyleDoc";
import { describe, expect, it } from "vitest";

import { calcArrowOutlineWidth } from "../calcArrowOutlineWidth";

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
