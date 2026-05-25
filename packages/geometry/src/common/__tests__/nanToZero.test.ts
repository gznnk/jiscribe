import { describe, it, expect } from "vitest";

import { nanToZero } from "../nanToZero";

describe("nanToZero", () => {
	it("NaNは0を返す", () => {
		expect(nanToZero(NaN)).toBe(0);
	});

	it("通常の数値はそのまま返す", () => {
		expect(nanToZero(5)).toBe(5);
		expect(nanToZero(0)).toBe(0);
		expect(nanToZero(-3)).toBe(-3);
	});
});
