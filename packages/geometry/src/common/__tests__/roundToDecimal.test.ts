import { describe, it, expect } from "vitest";

import { roundToDecimal } from "../roundToDecimal";

describe("roundToDecimal", () => {
	it("デフォルト（小数点2桁）に丸める", () => {
		expect(roundToDecimal(123.456)).toBe(123.46);
		expect(roundToDecimal(123.454)).toBe(123.45);
	});

	it("指定した桁数に丸める", () => {
		expect(roundToDecimal(123.456, 1)).toBe(123.5);
		expect(roundToDecimal(123.456, 0)).toBe(123);
	});

	it("整数はそのまま返す", () => {
		expect(roundToDecimal(100, 2)).toBe(100);
	});

	it("負の数も丸める", () => {
		expect(roundToDecimal(-1.235, 2)).toBe(-1.24);
	});
});
