import {
	calcEuclideanDistance,
	calcFrameKeyPoints,
	isTransformedFrame,
} from "@workspace/geometry";

import type {
	CenterAnchorSpec,
	ConnectPointAnchorSpec,
	ConnectPointId,
} from "../../../../../../schemas/objects/types/EndpointRef";

/**
 * 候補から除外するアンカーの指定。自己ループで「固定側と同じアンカー」や
 * center 同士の退化を避けるために使う。
 */
export type AnchorExclusion = {
	/** center を候補から除外する。 */
	center?: boolean;
	/** この connectPoint を候補から除外する。 */
	connectPointId?: ConnectPointId;
};

/**
 * カーソル位置に最も近いアンカーを返す。
 * フレームを持つオブジェクトは 4 中点 + center から選択し、
 * フレームを持たないオブジェクトは center を返す。
 *
 * `exclude` を渡すと該当アンカーを候補から外す（自己ループ時に固定側アンカーや
 * center を避けて、必ず別の辺中点へ接続させるために使う）。
 */
export function calcNearestAnchor(
	obj: { cx?: number; cy?: number; [key: string]: unknown },
	cursorX: number,
	cursorY: number,
	exclude?: AnchorExclusion,
): CenterAnchorSpec | ConnectPointAnchorSpec {
	if (!isTransformedFrame(obj)) {
		return { kind: "center" };
	}

	const keyPoints = calcFrameKeyPoints(obj);

	const allCandidates: Array<{
		id: ConnectPointId | null;
		x: number;
		y: number;
	}> = [
		{ id: null, x: obj.cx, y: obj.cy },
		{ id: "topCenter", x: keyPoints.topCenter.x, y: keyPoints.topCenter.y },
		{
			id: "rightCenter",
			x: keyPoints.rightCenter.x,
			y: keyPoints.rightCenter.y,
		},
		{
			id: "bottomCenter",
			x: keyPoints.bottomCenter.x,
			y: keyPoints.bottomCenter.y,
		},
		{
			id: "leftCenter",
			x: keyPoints.leftCenter.x,
			y: keyPoints.leftCenter.y,
		},
	];

	const candidates = allCandidates.filter((c) => {
		if (c.id === null) {
			return !exclude?.center;
		}
		return c.id !== exclude?.connectPointId;
	});

	// 除外で候補が空になることはない（連結点 5 個から最大 2 個しか除かない）が、
	// 防御的に center へフォールバックする。
	if (candidates.length === 0) {
		return { kind: "center" };
	}

	let nearest = candidates[0];
	let minDist = calcEuclideanDistance(cursorX, cursorY, nearest.x, nearest.y);

	for (let i = 1; i < candidates.length; i++) {
		const c = candidates[i];
		const dist = calcEuclideanDistance(cursorX, cursorY, c.x, c.y);
		if (dist < minDist) {
			minDist = dist;
			nearest = c;
		}
	}

	return nearest.id === null
		? { kind: "center" }
		: { kind: "connectPoint", id: nearest.id };
}
