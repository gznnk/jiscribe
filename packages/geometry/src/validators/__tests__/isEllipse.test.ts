import { describe, it, expect } from "vitest";

import { isEllipse } from "../isEllipse";

describe("isEllipse", () => {
	it("有効なEllipseオブジェクトはtrueを返す", () => {
		expect(isEllipse({ cx: 0, cy: 0, rx: 50, ry: 30 })).toBe(true);
		expect(isEllipse({ cx: -5, cy: 3, rx: 0, ry: 0 })).toBe(true);
	});

	it("rxが負の場合はfalseを返す", () => {
		expect(isEllipse({ cx: 0, cy: 0, rx: -1, ry: 30 })).toBe(false);
	});

	it("ryが負の場合はfalseを返す", () => {
		expect(isEllipse({ cx: 0, cy: 0, rx: 50, ry: -1 })).toBe(false);
	});

	it("プロパティが欠けている場合はfalseを返す", () => {
		expect(isEllipse({ cx: 0, cy: 0, rx: 50 })).toBe(false);
		expect(isEllipse({ cy: 0, rx: 50, ry: 30 })).toBe(false);
	});

	it("nullはfalseを返す", () => {
		expect(isEllipse(null)).toBe(false);
	});
});
