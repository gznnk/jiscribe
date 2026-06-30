import { describe, it, expect } from "vitest";

import type { SnapCandidate, SnapCandidates } from "../../../../CanvasTypes";
import { buildSnapFeedback, findSnap, SNAP_THRESHOLD_PX } from "../findSnap";

/** ターゲット候補（スナップ先）を作るヘルパー。 */
const xCandidate = (
	coordinate: number,
	edge: SnapCandidate["edge"],
	objectId = "target",
): SnapCandidate => ({
	objectId,
	coordinate,
	edge,
	perpendicularMin: 0,
	perpendicularMax: 100,
});

describe("findSnap - 中央スナップ", () => {
	const threshold = SNAP_THRESHOLD_PX; // zoom=1 相当

	it("中央↔中央: ドラッグ中心が他オブジェクトの中央線へ吸着する", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(100, "hCenter")],
			y: [],
		};
		// ドラッグ中の BBox: left=86, right=110 → centerX=98（候補100まで距離2）
		const result = findSnap(candidates, threshold, [86, 98, 110], []);

		expect(result.delta.x).toBe(2); // 98 → 100
		expect(result.xResult?.snapCoordinate).toBe(100);
	});

	it("中央↔エッジ: ドラッグ中心が他オブジェクトのエッジへ吸着する", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(50, "left")],
			y: [],
		};
		// centerX=52 → 候補50まで距離2
		const result = findSnap(candidates, threshold, [40, 52, 64], []);

		expect(result.delta.x).toBe(-2); // 52 → 50
	});

	it("エッジ↔中央: ドラッグエッジが他オブジェクトの中央線へ吸着する", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(200, "hCenter")],
			y: [],
		};
		// left=203 → 候補200まで距離3、centerX=233 / right=263 は範囲外
		const result = findSnap(candidates, threshold, [203, 233, 263], []);

		expect(result.delta.x).toBe(-3); // 203 → 200
	});

	it("最近接が優先される（中央より近いエッジがあればエッジを選ぶ）", () => {
		// findSnap は coordinate 昇順ソート済みの候補を前提とする（calcSnapCandidates が保証）
		const candidates: SnapCandidates = {
			x: [xCandidate(91, "left"), xCandidate(100, "hCenter")],
			y: [],
		};
		// left=90 → 候補91まで距離1、centerX=98 → 候補100まで距離2
		const result = findSnap(candidates, threshold, [90, 98, 106], []);

		expect(result.xResult?.snapCoordinate).toBe(91); // より近いエッジ
		expect(result.delta.x).toBe(1);
	});

	it("buildSnapFeedback: 中央一致時に中央線のガイドを生成する", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(100, "hCenter")],
			y: [],
		};
		const result = findSnap(candidates, threshold, [86, 98, 110], []);
		// スナップ適用後の BBox（centerX=100 になる）
		const actualBBox = { left: 88, right: 112, top: 0, bottom: 24 };

		const feedback = buildSnapFeedback(
			actualBBox,
			result.xResult,
			result.yResult,
			candidates,
		);

		expect(feedback.x).toHaveLength(1);
		expect(feedback.x[0].coordinate).toBe(100);
		expect(feedback.x[0].sourceObjectIds).toContain("target");
	});
});

describe("findSnap - 除外集合（excludeIds）", () => {
	const threshold = SNAP_THRESHOLD_PX;

	it("excludeIds の objectId はスナップ対象から除外される", () => {
		// 最近接(101)はドラッグ中の自身なので除外し、次に近い 110 へ吸着する
		const candidates: SnapCandidates = {
			x: [xCandidate(101, "left", "self"), xCandidate(110, "left", "other")],
			y: [],
		};
		const result = findSnap(
			candidates,
			threshold,
			[103],
			[],
			new Set(["self"]),
		);

		expect(result.xResult?.snapCoordinate).toBe(110);
		expect(result.delta.x).toBe(7);
	});

	it("除外により threshold 内に候補が無くなればスナップしない", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(101, "left", "self")],
			y: [],
		};
		const result = findSnap(
			candidates,
			threshold,
			[103],
			[],
			new Set(["self"]),
		);

		expect(result.xResult).toBeNull();
		expect(result.delta.x).toBe(0);
	});

	it("buildSnapFeedback も excludeIds の候補をガイドから除外する", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(100, "left", "self"), xCandidate(100, "left", "other")],
			y: [],
		};
		const result = findSnap(
			candidates,
			threshold,
			[100],
			[],
			new Set(["self"]),
		);
		const actualBBox = { left: 100, right: 100, top: 0, bottom: 24 };

		const feedback = buildSnapFeedback(
			actualBBox,
			result.xResult,
			result.yResult,
			candidates,
			new Set(["self"]),
		);

		expect(feedback.x).toHaveLength(1);
		expect(feedback.x[0].sourceObjectIds).toEqual(["other"]);
	});
});

describe("findSnap - 二分探索（多数候補・タイブレーク）", () => {
	const threshold = SNAP_THRESHOLD_PX;

	it("多数のソート済み候補から最近接を選ぶ", () => {
		const coords = [0, 50, 100, 150, 200, 250, 300, 350, 400];
		const candidates: SnapCandidates = {
			x: coords.map((c) => xCandidate(c, "left", `obj-${c}`)),
			y: [],
		};
		// 203 に最も近いのは 200（距離3）
		const result = findSnap(candidates, threshold, [203], []);

		expect(result.xResult?.snapCoordinate).toBe(200);
		expect(result.delta.x).toBe(-3);
	});

	it("同距離なら座標の小さい候補を優先する（線形版のタイブレーク維持）", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(98, "left"), xCandidate(102, "right")],
			y: [],
		};
		// 100 の左右に等距離(2)の候補。小さい 98 を選ぶ
		const result = findSnap(candidates, threshold, [100], []);

		expect(result.xResult?.snapCoordinate).toBe(98);
		expect(result.delta.x).toBe(-2);
	});

	it("threshold 丁度（=）は吸着しない（strict less）", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(100, "left")],
			y: [],
		};
		// 距離が threshold と同値なら吸着しない
		const result = findSnap(candidates, threshold, [100 + threshold], []);

		expect(result.xResult).toBeNull();
	});
});
