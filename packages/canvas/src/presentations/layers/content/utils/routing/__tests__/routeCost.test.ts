import { calcFrameBoxFeatures, type BoxFeatures } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import {
	calcRouteCost,
	compareCost,
	countBoxCrossings,
	countReversals,
} from "../routeCost";

// 中心 (100,100) 100x60 → AABB: left50 right150 top70 bottom130
const box: BoxFeatures = calcFrameBoxFeatures({
	cx: 100,
	cy: 100,
	width: 100,
	height: 60,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
});

describe("countReversals", () => {
	it("同一軸で逆走する中間点を折り返しとして数える", () => {
		expect(
			countReversals([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
				{ x: 50, y: 0 },
			]),
		).toBe(1);
	});

	it("直進・直角は折り返しではない", () => {
		expect(
			countReversals([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			]),
		).toBe(0);
		expect(
			countReversals([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
				{ x: 100, y: 100 },
			]),
		).toBe(0);
	});
});

describe("countBoxCrossings", () => {
	it("box を貫通するセグメントを数える", () => {
		expect(
			countBoxCrossings(
				[
					{ x: 0, y: 100 },
					{ x: 200, y: 100 },
				],
				box,
				null,
			),
		).toBe(1);
	});

	it("box の外を通るセグメントは数えない", () => {
		expect(
			countBoxCrossings(
				[
					{ x: 0, y: 0 },
					{ x: 200, y: 0 },
				],
				box,
				null,
			),
		).toBe(0);
	});

	it("垂直セグメントの貫通も 1 と数える", () => {
		// x=100 は (left50, right150) の内側、y は top70/bottom130 を跨ぐ
		expect(
			countBoxCrossings(
				[
					{ x: 100, y: 0 },
					{ x: 100, y: 200 },
				],
				box,
				null,
			),
		).toBe(1);
	});

	it("辺にちょうど乗る/接するだけのセグメントは数えない（接触は貫通でない）", () => {
		// 上辺 y=70 に乗る水平線
		expect(
			countBoxCrossings(
				[
					{ x: 0, y: 70 },
					{ x: 200, y: 70 },
				],
				box,
				null,
			),
		).toBe(0);
		// 左辺 x=50 で止まる（跨がない）水平線
		expect(
			countBoxCrossings(
				[
					{ x: 0, y: 100 },
					{ x: 50, y: 100 },
				],
				box,
				null,
			),
		).toBe(0);
	});
});

describe("compareCost", () => {
	it("貫通数が最優先（美観がどれだけ良くても貫通ありは負ける）", () => {
		const crossing = { crossings: 1, aesthetic: 0 };
		const clean = { crossings: 0, aesthetic: 9_999 };
		// compareCost(a,b) < 0 なら a が良い
		expect(compareCost(clean, crossing)).toBeLessThan(0);
	});

	it("貫通数が同じなら美観で比較する", () => {
		expect(
			compareCost(
				{ crossings: 0, aesthetic: 10 },
				{ crossings: 0, aesthetic: 20 },
			),
		).toBeLessThan(0);
	});
});

describe("calcRouteCost", () => {
	it("折り返しを含む経路は REVERSAL_PENALTY で大きく不利になる", () => {
		// 同じ「1 角」でも、逆走スパイクの方が回り込みより大幅に高コスト
		const spike = [
			{ x: 0, y: 0 },
			{ x: 20, y: 0 },
			{ x: 10, y: 0 },
		];
		const clean = [
			{ x: 0, y: 0 },
			{ x: 20, y: 0 },
			{ x: 20, y: 20 },
		];
		const spikeCost = calcRouteCost(spike, spike, null, null, false);
		const cleanCost = calcRouteCost(clean, clean, null, null, false);
		expect(spikeCost.crossings).toBe(0);
		expect(cleanCost.crossings).toBe(0);
		// ペナルティ（10,000）分、spike の aesthetic が桁違いに大きい
		expect(spikeCost.aesthetic).toBeGreaterThan(cleanCost.aesthetic + 9_000);
	});

	it("crossings は simplifiedElbow の貫通数を反映する", () => {
		const elbow = [
			{ x: 0, y: 100 },
			{ x: 200, y: 100 },
		];
		const cost = calcRouteCost(elbow, elbow, box, null, false);
		expect(cost.crossings).toBe(1);
	});
});
