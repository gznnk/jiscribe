import { describe, it, expect } from "vitest";

import { negativeToZero } from "../negativeToZero";

describe("negativeToZero", () => {
	it("returns 0 for negative numbers", () => {
		expect(negativeToZero(-1)).toBe(0);
		expect(negativeToZero(-0.001)).toBe(0);
	});

	it("passes zero through", () => {
		expect(negativeToZero(0)).toBe(0);
	});

	it("passes positive numbers through", () => {
		expect(negativeToZero(1)).toBe(1);
		expect(negativeToZero(100)).toBe(100);
	});
});
