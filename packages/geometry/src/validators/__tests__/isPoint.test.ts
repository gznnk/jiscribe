import { describe, it, expect } from "vitest";

import { isPoint } from "../isPoint";

describe("isPoint", () => {
	it("有効なPointオブジェクトはtrueを返す", () => {
		expect(isPoint({ x: 0, y: 0 })).toBe(true);
		expect(isPoint({ x: -5, y: 3.14 })).toBe(true);
	});

	it("追加プロパティがあってもtrueを返す", () => {
		expect(isPoint({ x: 1, y: 2, extra: "foo" })).toBe(true);
	});

	it("xがない場合はfalseを返す", () => {
		expect(isPoint({ y: 0 })).toBe(false);
	});

	it("yがない場合はfalseを返す", () => {
		expect(isPoint({ x: 0 })).toBe(false);
	});

	it("xが数値でない場合はfalseを返す", () => {
		expect(isPoint({ x: "0", y: 0 })).toBe(false);
	});

	it("nullはfalseを返す", () => {
		expect(isPoint(null)).toBe(false);
	});

	it("プリミティブはfalseを返す", () => {
		expect(isPoint(42)).toBe(false);
		expect(isPoint("string")).toBe(false);
	});
});
