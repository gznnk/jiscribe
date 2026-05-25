import { describe, it, expect } from "vitest";

import { isObject } from "../isObject";

describe("isObject", () => {
	it("プレーンオブジェクトはtrueを返す", () => {
		expect(isObject({})).toBe(true);
		expect(isObject({ a: 1 })).toBe(true);
	});

	it("nullはfalseを返す", () => {
		expect(isObject(null)).toBe(false);
	});

	it("配列はfalseを返す", () => {
		expect(isObject([])).toBe(false);
		expect(isObject([1, 2])).toBe(false);
	});

	it("プリミティブ値はfalseを返す", () => {
		expect(isObject("string")).toBe(false);
		expect(isObject(42)).toBe(false);
		expect(isObject(true)).toBe(false);
		expect(isObject(undefined)).toBe(false);
	});
});
