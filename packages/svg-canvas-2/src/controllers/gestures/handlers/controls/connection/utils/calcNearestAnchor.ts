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
 * カーソル位置に最も近いアンカーを返す。
 * フレームを持つオブジェクトは 4 中点 + center から選択し、
 * フレームを持たないオブジェクトは center を返す。
 */
export function calcNearestAnchor(
	obj: { cx?: number; cy?: number; [key: string]: unknown },
	cursorX: number,
	cursorY: number,
): CenterAnchorSpec | ConnectPointAnchorSpec {
	if (!isTransformedFrame(obj)) {
		return { kind: "center" };
	}

	const keyPoints = calcFrameKeyPoints(obj);

	const candidates: Array<{
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
