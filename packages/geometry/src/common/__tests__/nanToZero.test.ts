import { describe, it, expect } from "vitest";

import { nanToZero } from "../nanToZero";

describe("nanToZero", () => {
	it("returns 0 for NaN", () => {
		expect(nanToZero(NaN)).toBe(0);
	});

	it("passes ordinary numbers through", () => {
		expect(nanToZero(5)).toBe(5);
		expect(nanToZero(0)).toBe(0);
		expect(nanToZero(-3)).toBe(-3);
	});
});
