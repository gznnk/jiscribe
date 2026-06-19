import { describe, it, expect } from "vitest";

import { insetPolylineEnds } from "../insetPolylineEnds";

describe("insetPolylineEnds", () => {
	it("inset が 0 のときは元の点列をそのまま返す（コピー）", () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		];
		const result = insetPolylineEnds(points, 0, 0);
		expect(result).toEqual(points);
		expect(result).not.toBe(points);
		expect(result[0]).not.toBe(points[0]);
	});

	it("点が1つ以下のときはそのまま返す", () => {
		expect(insetPolylineEnds([{ x: 1, y: 2 }], 5, 5)).toEqual([{ x: 1, y: 2 }]);
		expect(insetPolylineEnds([], 5, 5)).toEqual([]);
	});

	it("startInset だけ先頭点を2番目の点へ向けて移動する", () => {
		const result = insetPolylineEnds(
			[
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			],
			9,
			0,
		);
		expect(result[0]).toEqual({ x: 9, y: 0 });
		expect(result[1]).toEqual({ x: 100, y: 0 });
	});

	it("endInset だけ末尾点を末尾から2番目の点へ向けて移動する", () => {
		const result = insetPolylineEnds(
			[
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			],
			0,
			18,
		);
		expect(result[0]).toEqual({ x: 0, y: 0 });
		expect(result[1]).toEqual({ x: 82, y: 0 });
	});

	it("斜め方向にも正しく適用する", () => {
		// (0,0)-(30,40) は長さ 50。inset 9 → ratio 9/50
		const result = insetPolylineEnds(
			[
				{ x: 0, y: 0 },
				{ x: 30, y: 40 },
			],
			9,
			0,
		);
		expect(result[0].x).toBeCloseTo((30 * 9) / 50);
		expect(result[0].y).toBeCloseTo((40 * 9) / 50);
		expect(result[1]).toEqual({ x: 30, y: 40 });
	});

	it("2点で inset 合計がセグメント長を超える場合は比例配分でクランプする", () => {
		// 長さ 12、両端 inset 9（合計 18 > 12）→ 各 6 にクランプ
		const result = insetPolylineEnds(
			[
				{ x: 0, y: 0 },
				{ x: 12, y: 0 },
			],
			9,
			9,
		);
		expect(result[0].x).toBeCloseTo(6);
		expect(result[1].x).toBeCloseTo(6);
	});

	it("多点ポリラインでは先頭・末尾セグメントのみ短縮し中間点は不変", () => {
		const result = insetPolylineEnds(
			[
				{ x: 0, y: 0 },
				{ x: 50, y: 0 },
				{ x: 100, y: 0 },
			],
			9,
			9,
		);
		expect(result[0]).toEqual({ x: 9, y: 0 });
		expect(result[1]).toEqual({ x: 50, y: 0 });
		expect(result[2]).toEqual({ x: 91, y: 0 });
	});

	it("inset がセグメント長を超える場合でも反転せずセグメント端で止まる（多点）", () => {
		// 先頭セグメント長 5 < inset 9 → 隣接点で止まる
		const result = insetPolylineEnds(
			[
				{ x: 0, y: 0 },
				{ x: 5, y: 0 },
				{ x: 100, y: 0 },
			],
			9,
			0,
		);
		expect(result[0]).toEqual({ x: 5, y: 0 });
	});

	it("長さ0のセグメントでは移動しない", () => {
		const result = insetPolylineEnds(
			[
				{ x: 5, y: 5 },
				{ x: 5, y: 5 },
			],
			9,
			9,
		);
		expect(result[0]).toEqual({ x: 5, y: 5 });
		expect(result[1]).toEqual({ x: 5, y: 5 });
	});
});
