import { describe, it, expect, assert } from "vitest";

import { calcOrientedFrameFromPoints } from "../../geometry/calcOrientedFrameFromPoints";

// シグネチャ: calcOrientedFrameFromPoints(points, scaleX=1, scaleY=1, rotationDeg=0)
describe("calcOrientedFrameFromPoints", () => {
	it("空配列の場合はnullを返す", () => {
		expect(calcOrientedFrameFromPoints([])).toBeNull();
	});

	it("1点の場合は幅・高さ0のフレームを返す", () => {
		const result = calcOrientedFrameFromPoints([{ x: 10, y: 20 }]);
		assert(result !== null);
		expect(result.cx).toBe(10);
		expect(result.cy).toBe(20);
		expect(result.width).toBe(0);
		expect(result.height).toBe(0);
		expect(result.rotation).toBe(0);
		expect(result.scaleX).toBe(1);
		expect(result.scaleY).toBe(1);
	});

	it("rotation=0の場合は軸平行なバウンディングフレームを返す", () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 60 },
			{ x: 0, y: 60 },
		];
		const result = calcOrientedFrameFromPoints(points, 1, 1, 0);
		assert(result !== null);
		expect(result.cx).toBeCloseTo(50);
		expect(result.cy).toBeCloseTo(30);
		expect(result.width).toBeCloseTo(100);
		expect(result.height).toBeCloseTo(60);
		expect(result.rotation).toBe(0);
	});

	it("rotation/scaleX/scaleYが結果に反映される", () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 60 },
			{ x: 0, y: 60 },
		];
		// シグネチャ: (points, scaleX, scaleY, rotation)
		const result = calcOrientedFrameFromPoints(points, -1, 1, 45);
		assert(result !== null);
		expect(result.rotation).toBe(45);
		expect(result.scaleX).toBe(-1);
		expect(result.scaleY).toBe(1);
	});

	it("90度回転時は逆変換後AABCから幅・高さが入れ替わる", () => {
		// 100x60 の矩形。rotation=90 の逆変換で軸が入れ替わり width=60, height=100 になる。
		// 中心は不変（50, 30）。
		const points = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 60 },
			{ x: 0, y: 60 },
		];
		const result = calcOrientedFrameFromPoints(points, 1, 1, 90);
		assert(result !== null);
		expect(result.cx).toBeCloseTo(50);
		expect(result.cy).toBeCloseTo(30);
		expect(result.width).toBeCloseTo(60);
		expect(result.height).toBeCloseTo(100);
	});

	// リグレッション: Math.min/max のスプレッド展開は大規模点群で
	// RangeError(Maximum call stack size exceeded) を起こしうるため、
	// 単一ループ化により数万点でもクラッシュしないことを保証する。
	it("数万点でもRangeErrorを起こさず正しいAABBを返す", () => {
		const count = 200_000;
		const points = Array.from({ length: count }, (_, i) => ({
			x: i,
			y: count - i,
		}));
		const result = calcOrientedFrameFromPoints(points);
		assert(result !== null);
		// x: 0..count-1, y: 1..count
		expect(result.cx).toBeCloseTo((count - 1) / 2);
		expect(result.cy).toBeCloseTo((count + 1) / 2);
		expect(result.width).toBeCloseTo(count - 1);
		expect(result.height).toBeCloseTo(count - 1);
	});
});
