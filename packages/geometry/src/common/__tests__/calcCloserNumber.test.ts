import { describe, it, expect } from "vitest";

import { calcCloserNumber } from "../calcCloserNumber";

describe("calcCloserNumber", () => {
	it("aがより近い場合はaを返す", () => {
		expect(calcCloserNumber(3, 4, 10)).toBe(4);
	});

	it("bがより近い場合はbを返す", () => {
		expect(calcCloserNumber(8, 4, 10)).toBe(10);
	});

	it("等距離の場合はaを返す（<=による優先）", () => {
		expect(calcCloserNumber(5, 3, 7)).toBe(3);
	});

	it("基準値と同じ値があればそれを返す", () => {
		expect(calcCloserNumber(4, 4, 10)).toBe(4);
	});
});
