import { describe, it, expect } from "vitest";

import { AUTO_SCROLL_STEP_SIZE } from "../../GestureRecognizerConstants";
import { calculateScrollDelta } from "../calculateScrollDelta";

const S = AUTO_SCROLL_STEP_SIZE;

describe("calculateScrollDelta", () => {
	describe("エッジなし（null/null）", () => {
		it("horizontal=null, vertical=null のとき deltaX=0, deltaY=0 を返す", () => {
			expect(calculateScrollDelta(null, null)).toEqual({
				deltaX: 0,
				deltaY: 0,
			});
		});
	});

	describe("水平方向のみ", () => {
		it("left のとき deltaX が負になる", () => {
			expect(calculateScrollDelta("left", null)).toEqual({
				deltaX: -S,
				deltaY: 0,
			});
		});

		it("right のとき deltaX が正になる", () => {
			expect(calculateScrollDelta("right", null)).toEqual({
				deltaX: S,
				deltaY: 0,
			});
		});
	});

	describe("垂直方向のみ", () => {
		it("top のとき deltaY が負になる", () => {
			expect(calculateScrollDelta(null, "top")).toEqual({
				deltaX: 0,
				deltaY: -S,
			});
		});

		it("bottom のとき deltaY が正になる", () => {
			expect(calculateScrollDelta(null, "bottom")).toEqual({
				deltaX: 0,
				deltaY: S,
			});
		});
	});

	describe("斜め方向（両方指定）", () => {
		it("left + top のとき両方負になる", () => {
			expect(calculateScrollDelta("left", "top")).toEqual({
				deltaX: -S,
				deltaY: -S,
			});
		});

		it("left + bottom のとき deltaX 負・deltaY 正になる", () => {
			expect(calculateScrollDelta("left", "bottom")).toEqual({
				deltaX: -S,
				deltaY: S,
			});
		});

		it("right + top のとき deltaX 正・deltaY 負になる", () => {
			expect(calculateScrollDelta("right", "top")).toEqual({
				deltaX: S,
				deltaY: -S,
			});
		});

		it("right + bottom のとき両方正になる", () => {
			expect(calculateScrollDelta("right", "bottom")).toEqual({
				deltaX: S,
				deltaY: S,
			});
		});
	});
});
