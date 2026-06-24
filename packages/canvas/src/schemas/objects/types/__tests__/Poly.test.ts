import { describe, expect, it } from "vitest";

import { isPoly } from "../Poly";

describe("isPoly", () => {
	it("有効な Point 配列を持つオブジェクトを受け入れる", () => {
		expect(
			isPoly({
				points: [
					{ x: 0, y: 0 },
					{ x: 10, y: 20 },
				],
			}),
		).toBe(true);
	});

	it("points が空配列でも受け入れる（every は true）", () => {
		expect(isPoly({ points: [] })).toBe(true);
	});

	it("points プロパティが無ければ拒否する", () => {
		expect(isPoly({})).toBe(false);
	});

	it("points が配列でなければ拒否する", () => {
		expect(isPoly({ points: "nope" })).toBe(false);
	});

	it("要素に Point でないものが含まれれば拒否する", () => {
		expect(isPoly({ points: [{ x: 0, y: 0 }, { x: 1 }] })).toBe(false);
		expect(isPoly({ points: [null] })).toBe(false);
	});

	it("オブジェクト以外を拒否する", () => {
		expect(isPoly(null)).toBe(false);
		expect(isPoly(undefined)).toBe(false);
		expect(isPoly([])).toBe(false);
	});
});
