import type { BoundingBox } from "@workspace/geometry";

import type {
	SnapCandidate,
	SnapCandidates,
	SnapAxisFeedback,
	SnapFeedback,
} from "../../../../../CanvasTypes";

export const SNAP_THRESHOLD_PX = 8;

/** 浮動小数点誤差吸収用 epsilon（SVG単位）*/
const SNAP_EPSILON = 0.5;

type SnapDelta = { x: number; y: number };

/**
 * findNearest の戻り値。スナップした候補・座標・元エッジ値を保持する。
 * buildSnapFeedback に渡してガイド線を生成するために使う。
 */
export type SnapAxisResult = {
	candidates: SnapCandidate[];
	snapCoordinate: number;
	draggedEdgeValue: number;
} | null;

export type FindSnapResult = {
	delta: SnapDelta;
	xResult: SnapAxisResult;
	yResult: SnapAxisResult;
};

/**
 * ソート済み候補配列から、threshold 以内で最近接の候補グループを返す。
 * 同一座標の候補はまとめて返す（複数オブジェクトへの同時スナップ対応）。
 */
const findNearest = (
	candidates: SnapCandidate[],
	edges: number[],
	threshold: number,
): SnapAxisResult => {
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

	if (bestCoordinate === null) {
		return null;
	}

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
	snappedEdges: number[],
	candidates: SnapCandidate[],
	perpendicularMin: number,
	perpendicularMax: number,
): SnapAxisFeedback[] => {
	const feedbacks: SnapAxisFeedback[] = [];

	// 同一値の重複を排除（点スナップで left=right になる場合など）
	const uniqueEdges = [...new Set(snappedEdges)];

	for (const edgeValue of uniqueEdges) {
		const matching: SnapCandidate[] = [];
		for (const c of candidates) {
			if (Math.abs(c.coordinate - edgeValue) <= SNAP_EPSILON) {
				matching.push(c);
			}
		}
		if (matching.length === 0) {
			continue;
		}

		const sourcePerpendicularMin = Math.min(
			...matching.map((c) => c.perpendicularMin),
		);
		const sourcePerpendicularMax = Math.max(
			...matching.map((c) => c.perpendicularMax),
		);
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
 * スナップ後の実際の BBox からガイド線フィードバックを生成する。
 * findSnap で得た xResult/yResult と、スナップ適用後の実際の BBox を渡す。
 * Drag では groupBBox + delta が actualBBox に相当し、
 * 変形スナップでは calculateResize 再実行後の BBox を渡すことで
 * ガイド線位置を実際の図形形状に合わせる。
 * 点スナップ（頂点）では left=right=x, top=bottom=y の BBox を渡す。
 */
export const buildSnapFeedback = (
	actualBBox: BoundingBox,
	xResult: SnapAxisResult,
	yResult: SnapAxisResult,
	candidates: SnapCandidates,
): SnapFeedback => ({
	x: xResult
		? collectAxisFeedbacks(
				[actualBBox.left, actualBBox.right],
				candidates.x,
				actualBBox.top,
				actualBBox.bottom,
			)
		: [],
	y: yResult
		? collectAxisFeedbacks(
				[actualBBox.top, actualBBox.bottom],
				candidates.y,
				actualBBox.left,
				actualBBox.right,
			)
		: [],
});

/**
 * エッジ値リストとスナップ候補を比較し、スナップ補正量と軸ごとのスナップ結果を返す。
 * ガイド線は buildSnapFeedback に実際のBBoxを渡して生成すること。
 *
 * @param candidates - dragStart 時に計算されたスナップ候補
 * @param thresholdSvg - スナップ閾値（SVG 座標単位）= SNAP_THRESHOLD_PX / zoom
 * @param xEdgeValues - X軸スナップ対象の座標値リスト。空配列でX軸スナップをスキップ
 * @param yEdgeValues - Y軸スナップ対象の座標値リスト。空配列でY軸スナップをスキップ
 */
export const findSnap = (
	candidates: SnapCandidates,
	thresholdSvg: number,
	xEdgeValues: number[],
	yEdgeValues: number[],
): FindSnapResult => {
	const delta: SnapDelta = { x: 0, y: 0 };

	const xResult = findNearest(candidates.x, xEdgeValues, thresholdSvg);
	const yResult = findNearest(candidates.y, yEdgeValues, thresholdSvg);

	if (xResult) {
		delta.x = xResult.snapCoordinate - xResult.draggedEdgeValue;
	}
	if (yResult) {
		delta.y = yResult.snapCoordinate - yResult.draggedEdgeValue;
	}

	return { delta, xResult, yResult };
};
