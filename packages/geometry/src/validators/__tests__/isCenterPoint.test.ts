import { describe, it, expect } from "vitest";

import { isCenterPoint } from "../isCenterPoint";

describe("isCenterPoint", () => {
	it("有効なCenterPointオブジェクトはtrueを返す", () => {
		expect(isCenterPoint({ cx: 0, cy: 0 })).toBe(true);
		expect(isCenterPoint({ cx: -5, cy: 3.14 })).toBe(true);
	});

	it("cxがない場合はfalseを返す", () => {
		expect(isCenterPoint({ cy: 0 })).toBe(false);
	});

	it("cyがない場合はfalseを返す", () => {
		expect(isCenterPoint({ cx: 0 })).toBe(false);
	});

	it("cxが数値でない場合はfalseを返す", () => {
		expect(isCenterPoint({ cx: "0", cy: 0 })).toBe(false);
	});

	it("nullはfalseを返す", () => {
		expect(isCenterPoint(null)).toBe(false);
	});
});
