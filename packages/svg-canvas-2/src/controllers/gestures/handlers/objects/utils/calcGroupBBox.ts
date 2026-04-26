import type { Point } from "@workspace/geometry";

import { hasFrameKeyPoints } from "../../../../../states/objects/base/FrameWithKeyPoints";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";

// TODO: 名前が不適切なのと、複数選択時はグループの角度の考慮が必要。また、FrameKeyPoints を持たないオブジェクトが混在する場合の挙動も要検討
// TODO: Poly系も計算に含める
// TODO: できれば、複数選択のアウトライン表示でもおなじ計算をしているので、計算は１回にしたい。
/**
 * 選択中オブジェクト全体のグループ AABB を eventStartState の keyPoints から計算し、delta 分シフトして返す。
 * Frame を持たないオブジェクトのみの場合は null を返す。
 */
export const calcGroupBBox = (
	eventStartObjects: Record<string, ObjectState>,
	selectedIds: string[],
	delta: Point,
): { left: number; right: number; top: number; bottom: number } | null => {
	let left = Infinity;
	let right = -Infinity;
	let top = Infinity;
	let bottom = -Infinity;

	for (const id of selectedIds) {
		const obj = eventStartObjects[id];
		if (!obj || !hasFrameKeyPoints(obj)) continue;
		const kp = obj.keyPoints;
		left = Math.min(
			left,
			kp.topLeft.x,
			kp.topRight.x,
			kp.bottomLeft.x,
			kp.bottomRight.x,
		);
		right = Math.max(
			right,
			kp.topLeft.x,
			kp.topRight.x,
			kp.bottomLeft.x,
			kp.bottomRight.x,
		);
		top = Math.min(
			top,
			kp.topLeft.y,
			kp.topRight.y,
			kp.bottomLeft.y,
			kp.bottomRight.y,
		);
		bottom = Math.max(
			bottom,
			kp.topLeft.y,
			kp.topRight.y,
			kp.bottomLeft.y,
			kp.bottomRight.y,
		);
	}

	if (!isFinite(left)) return null;

	return {
		left: left + delta.x,
		right: right + delta.x,
		top: top + delta.y,
		bottom: bottom + delta.y,
	};
};
