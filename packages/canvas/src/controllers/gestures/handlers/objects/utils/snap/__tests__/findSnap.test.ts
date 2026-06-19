import { describe, it, expect } from "vitest";

import type {
	SnapCandidate,
	SnapCandidates,
} from "../../../../../../CanvasTypes";
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
		const candidates: SnapCandidates = {
			x: [xCandidate(100, "hCenter"), xCandidate(91, "left")],
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
