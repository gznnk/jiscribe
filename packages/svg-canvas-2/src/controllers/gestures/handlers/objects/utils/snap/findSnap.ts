import type { BoundingBox } from "@workspace/geometry";

import type {
	SnapCandidate,
	SnapCandidates,
	SnapFeedback,
} from "../../../../../../states/canvas/SnapTypes";

export const SNAP_THRESHOLD_PX = 8;

type SnapDelta = { x: number; y: number };

type FindSnapResult = {
	delta: SnapDelta;
	feedback: SnapFeedback;
};

/**
 * ソート済み候補配列から、threshold 以内で最近接の候補グループを返す。
 * 同一座標の候補はまとめて返す（複数オブジェクトへの同時スナップ対応）。
 */
const findNearest = (
	candidates: SnapCandidate[],
	edges: number[],
	threshold: number,
): {
	candidates: SnapCandidate[];
	snapCoordinate: number;
	draggedEdgeValue: number;
} | null => {
	let bestDist = threshold;
	let bestCoordinate: number | null = null;
	let bestDraggedEdgeValue = 0;

	for (const edgeValue of edges) {
		for (const c of candidates) {
			const dist = Math.abs(c.coordinate - edgeValue);
			if (dist < bestDist) {
				bestDist = dist;
				bestCoordinate = c.coordinate;
				bestDraggedEdgeValue = edgeValue;
			}
		}
	}

	if (bestCoordinate === null) return null;

	const snappedCandidates = candidates.filter(
		(c) => c.coordinate === bestCoordinate,
	);
	return {
		candidates: snappedCandidates,
		snapCoordinate: bestCoordinate,
		draggedEdgeValue: bestDraggedEdgeValue,
	};
};

/**
 * ドラッグ中グループのバウンディングボックスとスナップ候補を比較し、
 * スナップ補正量とフィードバック情報を返す。
 *
 * @param groupBBox - 選択オブジェクト全体の AABB（delta 適用後の仮位置）
 * @param candidates - dragStart 時に計算されたスナップ候補
 * @param thresholdSvg - スナップ閾値（SVG 座標単位）= SNAP_THRESHOLD_PX / zoom
 */
export const findSnap = (
	groupBBox: BoundingBox,
	candidates: SnapCandidates,
	thresholdSvg: number,
): FindSnapResult => {
	const delta: SnapDelta = { x: 0, y: 0 };

	// --- ① スナップ補正量を先にすべて計算 ---
	const xResult = findNearest(
		candidates.x,
		[groupBBox.left, groupBBox.right],
		thresholdSvg,
	);
	const yResult = findNearest(
		candidates.y,
		[groupBBox.top, groupBBox.bottom],
		thresholdSvg,
	);

	if (xResult) delta.x = xResult.snapCoordinate - xResult.draggedEdgeValue;
	if (yResult) delta.y = yResult.snapCoordinate - yResult.draggedEdgeValue;

	// --- ② スナップ後の AABB を算出（ガイド線の範囲はこちらを使う）---
	// groupBBox はスナップ補正前なので、delta を加算してスナップ後の座標に揃える。
	// こうすることで、図形の実際の描画位置とガイド線の範囲が一致する。
	const snappedBBox: BoundingBox = {
		left: groupBBox.left + delta.x,
		right: groupBBox.right + delta.x,
		top: groupBBox.top + delta.y,
		bottom: groupBBox.bottom + delta.y,
	};

	// --- ③ ガイド線のフィードバックを生成 ---
	const feedback: SnapFeedback = { x: null, y: null };

	if (xResult) {
		// 縦ガイド線の Y 範囲 = スナップ後グループとスナップ先のユニオン
		const sourcePerpendicularMin = Math.min(
			...xResult.candidates.map((c) => c.perpendicularMin),
		);
		const sourcePerpendicularMax = Math.max(
			...xResult.candidates.map((c) => c.perpendicularMax),
		);
		feedback.x = {
			coordinate: xResult.snapCoordinate,
			lineStart: Math.min(snappedBBox.top, sourcePerpendicularMin),
			lineEnd: Math.max(snappedBBox.bottom, sourcePerpendicularMax),
			sourceObjectIds: [...new Set(xResult.candidates.map((c) => c.objectId))],
		};
	}

	if (yResult) {
		// 横ガイド線の X 範囲 = スナップ後グループとスナップ先のユニオン
		const sourcePerpendicularMin = Math.min(
			...yResult.candidates.map((c) => c.perpendicularMin),
		);
		const sourcePerpendicularMax = Math.max(
			...yResult.candidates.map((c) => c.perpendicularMax),
		);
		feedback.y = {
			coordinate: yResult.snapCoordinate,
			lineStart: Math.min(snappedBBox.left, sourcePerpendicularMin),
			lineEnd: Math.max(snappedBBox.right, sourcePerpendicularMax),
			sourceObjectIds: [...new Set(yResult.candidates.map((c) => c.objectId))],
		};
	}

	return { delta, feedback };
};
