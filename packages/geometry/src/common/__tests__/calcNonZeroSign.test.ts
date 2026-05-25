import { describe, it, expect } from "vitest";

import { calcNonZeroSign } from "../calcNonZeroSign";

describe("calcNonZeroSign", () => {
	it("正の数は1を返す", () => {
		expect(calcNonZeroSign(5)).toBe(1);
		expect(calcNonZeroSign(0.001)).toBe(1);
	});

	it("0は1を返す（Math.signとの違い）", () => {
		expect(calcNonZeroSign(0)).toBe(1);
	});

	it("負の数は-1を返す", () => {
		expect(calcNonZeroSign(-1)).toBe(-1);
		expect(calcNonZeroSign(-100)).toBe(-1);
	});
});
