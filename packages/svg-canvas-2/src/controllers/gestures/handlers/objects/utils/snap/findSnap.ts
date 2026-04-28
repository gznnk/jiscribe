import type { BoundingBox } from "@workspace/geometry";

import type {
	SnapCandidate,
	SnapCandidates,
	SnapAxisFeedback,
	SnapFeedback,
} from "../../../../../../states/canvas/SnapTypes";

export const SNAP_THRESHOLD_PX = 8;

/** 浮動小数点誤差吸収用 epsilon（SVG単位）*/
const SNAP_EPSILON = 0.5;

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
 * スナップ後の各エッジについて、候補と一致するガイドを収集する。
 * 一次スナップで合わせたエッジは必ず一致し、もう一方のエッジはオブジェクトの
 * 幅/高さがちょうど2つのスナップ線の間に収まる場合のみ一致する。
 *
 * @param snappedEdges - スナップ後のエッジ座標（x軸なら[left, right]）
 * @param candidates - ソート済みスナップ候補
 * @param perpendicularMin - ガイド線垂直方向のグループ側範囲（開始）
 * @param perpendicularMax - ガイド線垂直方向のグループ側範囲（終了）
 */
const collectAxisFeedbacks = (
	snappedEdges: [number, number],
	candidates: SnapCandidate[],
	perpendicularMin: number,
	perpendicularMax: number,
): SnapAxisFeedback[] => {
	const feedbacks: SnapAxisFeedback[] = [];

	for (const edgeValue of snappedEdges) {
		const matching: SnapCandidate[] = [];
		for (const c of candidates) {
			if (Math.abs(c.coordinate - edgeValue) <= SNAP_EPSILON) {
				matching.push(c);
			}
		}
		if (matching.length === 0) continue;

		const sourcePerpendicularMin = Math.min(...matching.map((c) => c.perpendicularMin));
		const sourcePerpendicularMax = Math.max(...matching.map((c) => c.perpendicularMax));
		feedbacks.push({
			coordinate: matching[0].coordinate,
			lineStart: Math.min(perpendicularMin, sourcePerpendicularMin),
			lineEnd: Math.max(perpendicularMax, sourcePerpendicularMax),
			sourceObjectIds: [...new Set(matching.map((c) => c.objectId))],
		});
	}

	return feedbacks;
};

/**
 * ドラッグ中グループのバウンディングボックスとスナップ候補を比較し、
 * スナップ補正量とフィードバック情報を返す。
 *
 * @param groupBBox - 選択オブジェクト全体の AABB（delta 適用後の仮位置）
 * @param candidates - dragStart 時に計算されたスナップ候補
 * @param thresholdSvg - スナップ閾値（SVG 座標単位）= SNAP_THRESHOLD_PX / zoom
 * @param xEdgeValues - スナップ判定するX軸エッジ値の配列（省略時は left/right 両方）
 * @param yEdgeValues - スナップ判定するY軸エッジ値の配列（省略時は top/bottom 両方）
 */
export const findSnap = (
	groupBBox: BoundingBox,
	candidates: SnapCandidates,
	thresholdSvg: number,
	xEdgeValues?: number[],
	yEdgeValues?: number[],
): FindSnapResult => {
	const delta: SnapDelta = { x: 0, y: 0 };

	// --- ① スナップ補正量を先にすべて計算 ---
	const xResult = findNearest(
		candidates.x,
		xEdgeValues ?? [groupBBox.left, groupBBox.right],
		thresholdSvg,
	);
	const yResult = findNearest(
		candidates.y,
		yEdgeValues ?? [groupBBox.top, groupBBox.bottom],
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
	// スナップ後の各エッジを候補と照合し、一致するもの全てをガイドとして収集する。
	// 一次スナップで合わせたエッジは必ず一致し、もう一方のエッジはオブジェクトの
	// 幅/高さが2つのスナップ線の間にちょうど収まる場合にのみ一致する。
	const feedback: SnapFeedback = {
		x: xResult
			? collectAxisFeedbacks(
					[snappedBBox.left, snappedBBox.right],
					candidates.x,
					snappedBBox.top,
					snappedBBox.bottom,
				)
			: [],
		y: yResult
			? collectAxisFeedbacks(
					[snappedBBox.top, snappedBBox.bottom],
					candidates.y,
					snappedBBox.left,
					snappedBBox.right,
				)
			: [],
	};

	return { delta, feedback };
};
