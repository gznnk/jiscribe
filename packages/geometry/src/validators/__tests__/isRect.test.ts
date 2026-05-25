import { describe, it, expect } from "vitest";

import { isRect } from "../isRect";

describe("isRect", () => {
	it("有効なRectオブジェクトはtrueを返す", () => {
		expect(isRect({ x: 0, y: 0, width: 100, height: 60 })).toBe(true);
		expect(isRect({ x: -10, y: 5, width: 0, height: 0 })).toBe(true);
	});

	it("widthが負の場合はfalseを返す", () => {
		expect(isRect({ x: 0, y: 0, width: -1, height: 60 })).toBe(false);
	});

	it("heightが負の場合はfalseを返す", () => {
		expect(isRect({ x: 0, y: 0, width: 100, height: -1 })).toBe(false);
	});

	it("プロパティが欠けている場合はfalseを返す", () => {
		expect(isRect({ x: 0, y: 0, width: 100 })).toBe(false);
		expect(isRect({ y: 0, width: 100, height: 60 })).toBe(false);
	});

	it("xが数値でない場合はfalseを返す", () => {
		expect(isRect({ x: "0", y: 0, width: 100, height: 60 })).toBe(false);
	});

	it("nullはfalseを返す", () => {
		expect(isRect(null)).toBe(false);
	});
});
