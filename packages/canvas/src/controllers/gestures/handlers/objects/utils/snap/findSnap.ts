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

/**
 * 除外なしを表す共有の空セット。excludeIds 省略時のデフォルトに使い、
 * 呼び出し毎の Set 生成を避ける。
 */
const NO_EXCLUDE: ReadonlySet<string> = new Set();

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
 * ソート済み配列から coordinate >= value となる最小インデックス（lower bound）を返す。
 */
const lowerBound = (candidates: SnapCandidate[], value: number): number => {
	let lo = 0;
	let hi = candidates.length;
	while (lo < hi) {
		const mid = (lo + hi) >>> 1;
		if (candidates[mid].coordinate < value) {
			lo = mid + 1;
		} else {
			hi = mid;
		}
	}
	return lo;
};

/**
 * snapCoordinate の ±SNAP_EPSILON に入る非除外候補を、ソート済み配列から二分探索で集める。
 * 丸め誤差を吸収して同一スナップ線に束ねる（厳密等価だと別経路算出の極近座標がまとまらない）。
 */
const collectWithinEpsilon = (
	candidates: SnapCandidate[],
	snapCoordinate: number,
	excludeIds: ReadonlySet<string>,
): SnapCandidate[] => {
	const result: SnapCandidate[] = [];
	const upper = snapCoordinate + SNAP_EPSILON;
	for (
		let i = lowerBound(candidates, snapCoordinate - SNAP_EPSILON);
		i < candidates.length && candidates[i].coordinate <= upper;
		i++
	) {
		if (!excludeIds.has(candidates[i].objectId)) {
			result.push(candidates[i]);
		}
	}
	return result;
};

/**
 * ソート済み候補配列から、threshold 以内で最近接の候補グループを返す。
 * 候補は coordinate 昇順ソート済みである前提で、各 edgeValue を二分探索する
 * （O(edges × log candidates)）。excludeIds に含まれる objectId の候補は除外する。
 * 同一座標の候補はまとめて返す（複数オブジェクトへの同時スナップ対応）。
 */
const findNearest = (
	candidates: SnapCandidate[],
	edges: number[],
	threshold: number,
	excludeIds: ReadonlySet<string>,
): SnapAxisResult => {
	let bestDist = threshold;
	let bestCoordinate: number | null = null;
	let bestDraggedEdgeValue = 0;

	for (const edgeValue of edges) {
		const insert = lowerBound(candidates, edgeValue);

		// 挿入位置の左側（coordinate <= edgeValue）で最初の非除外候補
		let left = insert - 1;
		while (left >= 0 && excludeIds.has(candidates[left].objectId)) {
			left--;
		}
		// 挿入位置の右側（coordinate >= edgeValue）で最初の非除外候補
		let right = insert;
		while (
			right < candidates.length &&
			excludeIds.has(candidates[right].objectId)
		) {
			right++;
		}

		// 左右で近い方を採用。同距離なら座標の小さい左側を優先し、
		// 線形探索版（昇順走査・strict less）のタイブレークを維持する。
		const leftDist =
			left >= 0 ? edgeValue - candidates[left].coordinate : Infinity;
		const rightDist =
			right < candidates.length
				? candidates[right].coordinate - edgeValue
				: Infinity;
		const nearestDist = Math.min(leftDist, rightDist);

		if (nearestDist < bestDist) {
			bestDist = nearestDist;
			bestCoordinate =
				leftDist <= rightDist
					? candidates[left].coordinate
					: candidates[right].coordinate;
			bestDraggedEdgeValue = edgeValue;
		}
	}

	if (bestCoordinate === null) {
		return null;
	}

	return {
		candidates: collectWithinEpsilon(candidates, bestCoordinate, excludeIds),
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
 * @param excludeIds - ガイド対象から除外する objectId（ドラッグ中の自身など）
 */
const collectAxisFeedbacks = (
	snappedEdges: number[],
	candidates: SnapCandidate[],
	perpendicularMin: number,
	perpendicularMax: number,
	excludeIds: ReadonlySet<string>,
): SnapAxisFeedback[] => {
	const feedbacks: SnapAxisFeedback[] = [];

	// 同一値の重複を排除（点スナップで left=right になる場合など）
	const uniqueEdges = [...new Set(snappedEdges)];

	for (const edgeValue of uniqueEdges) {
		const matching = collectWithinEpsilon(candidates, edgeValue, excludeIds);
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
 *
 * @param excludeIds - ガイド対象から除外する objectId（省略時は除外なし）
 */
export const buildSnapFeedback = (
	actualBBox: BoundingBox,
	xResult: SnapAxisResult,
	yResult: SnapAxisResult,
	candidates: SnapCandidates,
	excludeIds: ReadonlySet<string> = NO_EXCLUDE,
): SnapFeedback => {
	// 中央（中点）も含めてガイド対象に。中央が候補と一致したときに青破線を描画する。
	// 点スナップ（left=right）では collectAxisFeedbacks 内の Set 重複排除で吸収される。
	const centerX = (actualBBox.left + actualBBox.right) / 2;
	const centerY = (actualBBox.top + actualBBox.bottom) / 2;
	return {
		x: xResult
			? collectAxisFeedbacks(
					[actualBBox.left, centerX, actualBBox.right],
					candidates.x,
					actualBBox.top,
					actualBBox.bottom,
					excludeIds,
				)
			: [],
		y: yResult
			? collectAxisFeedbacks(
					[actualBBox.top, centerY, actualBBox.bottom],
					candidates.y,
					actualBBox.left,
					actualBBox.right,
					excludeIds,
				)
			: [],
	};
};

/**
 * エッジ値リストとスナップ候補を比較し、スナップ補正量と軸ごとのスナップ結果を返す。
 * ガイド線は buildSnapFeedback に実際のBBoxを渡して生成すること。
 *
 * @param candidates - dragStart 時に計算されたスナップ候補（coordinate 昇順ソート済み）
 * @param thresholdSvg - スナップ閾値（SVG 座標単位）= SNAP_THRESHOLD_PX / zoom
 * @param xEdgeValues - X軸スナップ対象の座標値リスト。空配列でX軸スナップをスキップ
 * @param yEdgeValues - Y軸スナップ対象の座標値リスト。空配列でY軸スナップをスキップ
 * @param excludeIds - スナップ対象から除外する objectId（ドラッグ中の自身など。省略時は除外なし）
 */
export const findSnap = (
	candidates: SnapCandidates,
	thresholdSvg: number,
	xEdgeValues: number[],
	yEdgeValues: number[],
	excludeIds: ReadonlySet<string> = NO_EXCLUDE,
): FindSnapResult => {
	const delta: SnapDelta = { x: 0, y: 0 };

	const xResult = findNearest(
		candidates.x,
		xEdgeValues,
		thresholdSvg,
		excludeIds,
	);
	const yResult = findNearest(
		candidates.y,
		yEdgeValues,
		thresholdSvg,
		excludeIds,
	);

	if (xResult) {
		delta.x = xResult.snapCoordinate - xResult.draggedEdgeValue;
	}
	if (yResult) {
		delta.y = yResult.snapCoordinate - yResult.draggedEdgeValue;
	}

	return { delta, xResult, yResult };
};
