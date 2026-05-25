import { describe, it, expect } from "vitest";

import { isFrame } from "../isFrame";

describe("isFrame", () => {
	it("有効なFrameオブジェクトはtrueを返す", () => {
		expect(isFrame({ cx: 50, cy: 30, width: 100, height: 60 })).toBe(true);
		expect(isFrame({ cx: 0, cy: 0, width: 0, height: 0 })).toBe(true);
	});

	it("widthが負の場合はfalseを返す", () => {
		expect(isFrame({ cx: 0, cy: 0, width: -1, height: 60 })).toBe(false);
	});

	it("heightが負の場合はfalseを返す", () => {
		expect(isFrame({ cx: 0, cy: 0, width: 100, height: -1 })).toBe(false);
	});

	it("プロパティが欠けている場合はfalseを返す", () => {
		expect(isFrame({ cy: 0, width: 100, height: 60 })).toBe(false);
		expect(isFrame({ cx: 50, cy: 30, width: 100 })).toBe(false);
	});

	it("cxが数値でない場合はfalseを返す", () => {
		expect(isFrame({ cx: "50", cy: 30, width: 100, height: 60 })).toBe(false);
	});

	it("nullはfalseを返す", () => {
		expect(isFrame(null)).toBe(false);
	});
});
