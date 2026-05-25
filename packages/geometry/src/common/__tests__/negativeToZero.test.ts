import { describe, it, expect } from "vitest";

import { negativeToZero } from "../negativeToZero";

describe("negativeToZero", () => {
	it("負の数は0を返す", () => {
		expect(negativeToZero(-1)).toBe(0);
		expect(negativeToZero(-0.001)).toBe(0);
	});

	it("0はそのまま返す", () => {
		expect(negativeToZero(0)).toBe(0);
	});

	it("正の数はそのまま返す", () => {
		expect(negativeToZero(1)).toBe(1);
		expect(negativeToZero(100)).toBe(100);
	});
});
