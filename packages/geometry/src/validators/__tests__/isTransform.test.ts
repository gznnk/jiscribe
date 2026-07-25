import { describe, it, expect } from "vitest";

import { isTransform } from "../isTransform";

describe("isTransform", () => {
	it("有効なTransformオブジェクトはtrueを返す", () => {
		expect(isTransform({ rotation: 0, scaleX: 1, scaleY: 1 })).toBe(true);
		expect(isTransform({ rotation: 45, scaleX: -1, scaleY: 1 })).toBe(true);
	});

	it("scaleX/scaleYが1でも-1でもない場合はfalseを返す", () => {
		expect(isTransform({ rotation: 0, scaleX: 2, scaleY: 1 })).toBe(false);
		expect(isTransform({ rotation: 0, scaleX: 1, scaleY: 0.5 })).toBe(false);
		expect(isTransform({ rotation: 0, scaleX: 0, scaleY: 1 })).toBe(false);
	});

	it("rotationがない場合はfalseを返す", () => {
		expect(isTransform({ scaleX: 1, scaleY: 1 })).toBe(false);
	});

	it("scaleXがない場合はfalseを返す", () => {
		expect(isTransform({ rotation: 0, scaleY: 1 })).toBe(false);
	});

	it("scaleYがない場合はfalseを返す", () => {
		expect(isTransform({ rotation: 0, scaleX: 1 })).toBe(false);
	});

	it("rotationが数値でない場合はfalseを返す", () => {
		expect(isTransform({ rotation: "45", scaleX: 1, scaleY: 1 })).toBe(false);
	});

	it("nullはfalseを返す", () => {
		expect(isTransform(null)).toBe(false);
	});
});
