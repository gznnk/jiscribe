import { describe, expect, it } from "vitest";

import {
	MAX_OPACITY_PERCENT,
	MIN_OPACITY_PERCENT,
	toOpacityPercent,
	toOpacityValue,
} from "../opacityPercent";

describe("toOpacityPercent", () => {
	it("scales the document's 0..1 to whole percent", () => {
		expect(toOpacityPercent(0.4)).toBe(40);
	});

	it("states both ends as the field's own bounds", () => {
		expect(toOpacityPercent(0)).toBe(MIN_OPACITY_PERCENT);
		expect(toOpacityPercent(1)).toBe(MAX_OPACITY_PERCENT);
	});

	it("rounds, the field stating no decimals", () => {
		expect(toOpacityPercent(0.125)).toBe(13);
		expect(toOpacityPercent(0.124)).toBe(12);
	});

	it("clamps a value from outside the range into it", () => {
		expect(toOpacityPercent(-0.5)).toBe(MIN_OPACITY_PERCENT);
		expect(toOpacityPercent(2)).toBe(MAX_OPACITY_PERCENT);
	});
});

describe("toOpacityValue", () => {
	it("scales the field's percent back to 0..1", () => {
		expect(toOpacityValue(40)).toBe(0.4);
	});

	it("states both ends as the document's own bounds", () => {
		expect(toOpacityValue(MIN_OPACITY_PERCENT)).toBe(0);
		expect(toOpacityValue(MAX_OPACITY_PERCENT)).toBe(1);
	});

	it("clamps a percent from outside the range into it", () => {
		expect(toOpacityValue(-20)).toBe(0);
		expect(toOpacityValue(140)).toBe(1);
	});
});

describe("the two together", () => {
	it("leave a whole percent where it was", () => {
		for (
			let percent = MIN_OPACITY_PERCENT;
			percent <= MAX_OPACITY_PERCENT;
			percent++
		) {
			expect(toOpacityPercent(toOpacityValue(percent))).toBe(percent);
		}
	});
});
