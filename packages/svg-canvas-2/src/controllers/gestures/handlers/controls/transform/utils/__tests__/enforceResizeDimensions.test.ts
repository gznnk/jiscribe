import type { TransformedFrame } from "@workspace/geometry";
import { describe, it, expect } from "vitest";

import type { TransformState } from "../../../../../../../states/objects/base/TransformState";
import {
	calcHeightWithAspectRatio,
	calcWidthWithAspectRatio,
	enforceResizeDimensions,
} from "../enforceResizeDimensions";

const makeFrame = (
	minWidth?: number,
	minHeight?: number,
): TransformedFrame & TransformState =>
	({
		cx: 0,
		cy: 0,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		minWidth,
		minHeight,
	}) as TransformedFrame & TransformState;

describe("calcHeightWithAspectRatio", () => {
	it("width=100, ratio=2 のとき 50 を返す", () => {
		expect(calcHeightWithAspectRatio(100, 2)).toBe(50);
	});

	it("width=100, ratio=0.5 のとき 200 を返す", () => {
		expect(calcHeightWithAspectRatio(100, 0.5)).toBe(200);
	});

	it("width=0 のとき 0 を返す", () => {
		expect(calcHeightWithAspectRatio(0, 2)).toBe(0);
	});
});

describe("calcWidthWithAspectRatio", () => {
	it("height=50, ratio=2 のとき 100 を返す", () => {
		expect(calcWidthWithAspectRatio(50, 2)).toBe(100);
	});

	it("height=100, ratio=0.5 のとき 50 を返す", () => {
		expect(calcWidthWithAspectRatio(100, 0.5)).toBe(50);
	});

	it("height=0 のとき 0 を返す", () => {
		expect(calcWidthWithAspectRatio(0, 2)).toBe(0);
	});
});

describe("enforceResizeDimensions", () => {
	describe("最小値内（クランプ不要）", () => {
		it("幅・高さが両方最小値以上のとき、入力値をそのまま返す", () => {
			const frame = makeFrame(10, 10);
			expect(enforceResizeDimensions(frame, 50, 50, undefined, false)).toEqual({
				width: 50,
				height: 50,
			});
		});

		it("最小値が未設定（undefined）のとき、どんな値も通過する", () => {
			const frame = makeFrame(undefined, undefined);
			expect(enforceResizeDimensions(frame, 1, 1, undefined, false)).toEqual({
				width: 1,
				height: 1,
			});
		});
	});

	describe("アスペクト比なし（shouldKeepProportion=false）", () => {
		it("幅が最小値未満のとき幅だけクランプする", () => {
			const frame = makeFrame(20, 20);
			expect(enforceResizeDimensions(frame, 5, 50, undefined, false)).toEqual({
				width: 20,
				height: 50,
			});
		});

		it("高さが最小値未満のとき高さだけクランプする", () => {
			const frame = makeFrame(20, 20);
			expect(enforceResizeDimensions(frame, 50, 5, undefined, false)).toEqual({
				width: 50,
				height: 20,
			});
		});

		it("幅・高さ両方が最小値未満のとき両方クランプする", () => {
			const frame = makeFrame(20, 30);
			expect(enforceResizeDimensions(frame, 5, 5, undefined, false)).toEqual({
				width: 20,
				height: 30,
			});
		});

		it("負の幅は符号を保って最小値に切り上げる", () => {
			const frame = makeFrame(20, 20);
			const result = enforceResizeDimensions(frame, -5, 50, undefined, false);
			expect(result.width).toBe(-20);
		});
	});

	describe("アスペクト比あり（shouldKeepProportion=true）", () => {
		it("最小値から導出した幅・高さを返す（ratio=2の場合）", () => {
			const frame = makeFrame(10, 10);
			// ratio=2 → minWidthFromHeight = 10*2 = 20 > minWidth=10
			// → adjustedHeight = minHeight = 10, adjustedWidth = 20
			const result = enforceResizeDimensions(frame, 5, 5, 2, true);
			expect(result.width).toBe(20);
			expect(result.height).toBe(10);
		});

		it("aspectRatio=undefined のとき比率なしと同等の動作をする", () => {
			const frame = makeFrame(20, 20);
			expect(enforceResizeDimensions(frame, 5, 5, undefined, true)).toEqual({
				width: 20,
				height: 20,
			});
		});
	});
});
