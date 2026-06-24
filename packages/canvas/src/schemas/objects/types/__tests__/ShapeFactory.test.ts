import { describe, expect, it } from "vitest";

import { numberOverride } from "../ShapeFactory";

describe("numberOverride", () => {
	it("number が渡されればそれをそのまま返す", () => {
		expect(numberOverride(42, 10)).toBe(42);
		expect(numberOverride(0, 10)).toBe(0);
		expect(numberOverride(-5, 10)).toBe(-5);
	});

	it("有限数以外なら fallback を返す", () => {
		expect(numberOverride(undefined, 10)).toBe(10);
		expect(numberOverride(null, 10)).toBe(10);
		expect(numberOverride("3", 10)).toBe(10);
		// NaN / Infinity は寸法として無効なので fallback に倒す
		expect(numberOverride(NaN, 10)).toBe(10);
		expect(numberOverride(Infinity, 10)).toBe(10);
	});
});
