import { describe, expect, it } from "vitest";

import {
	MAX_ARROW_SCALE_PERCENT,
	MIN_ARROW_SCALE_PERCENT,
	toArrowScalePercent,
	toArrowScaleValue,
} from "../arrowScalePercent";

describe("toArrowScalePercent", () => {
	it("states the factor in whole percent, 20..400", () => {
		expect(toArrowScalePercent(1.5)).toBe(150);
		expect(toArrowScalePercent(0.2)).toBe(MIN_ARROW_SCALE_PERCENT);
		expect(toArrowScalePercent(4)).toBe(MAX_ARROW_SCALE_PERCENT);
		expect(MIN_ARROW_SCALE_PERCENT).toBe(20);
		expect(MAX_ARROW_SCALE_PERCENT).toBe(400);
	});

	it("rounds, and clamps a factor from outside the range into it", () => {
		expect(toArrowScalePercent(1.234)).toBe(123);
		expect(toArrowScalePercent(0.1)).toBe(20);
		expect(toArrowScalePercent(9)).toBe(400);
	});
});

describe("toArrowScaleValue", () => {
	it("scales the field's percent back to the factor, clamped to 0.2..4", () => {
		expect(toArrowScaleValue(150)).toBe(1.5);
		expect(toArrowScaleValue(10)).toBe(0.2);
		expect(toArrowScaleValue(1000)).toBe(4);
	});

	it("leaves a whole percent where it was, through the pair", () => {
		for (
			let percent = MIN_ARROW_SCALE_PERCENT;
			percent <= MAX_ARROW_SCALE_PERCENT;
			percent++
		) {
			expect(toArrowScalePercent(toArrowScaleValue(percent))).toBe(percent);
		}
	});
});
