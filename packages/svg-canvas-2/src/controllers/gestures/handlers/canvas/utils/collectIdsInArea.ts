import { calcBoundingBox, isTransformedFrame } from "@workspace/geometry";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";

/**
 * 範囲選択の矩形内に完全に含まれるオブジェクトのIDを収集する。
 * すべてのオブジェクト（グループの子要素含む）を走査する。
 */
export function collectIdsInArea(
	objects: Record<string, ObjectState>,
	areaMinX: number,
	areaMinY: number,
	areaMaxX: number,
	areaMaxY: number,
): string[] {
	const result: string[] = [];

	for (const obj of Object.values(objects)) {
		if (!obj) continue;

		// TransformedFrame を持つオブジェクトのみ判定可能
		if (!isTransformedFrame(obj)) continue;

		const bbox = calcBoundingBox(obj);

		// 完全に含まれるかチェック
		if (
			bbox.left >= areaMinX &&
			bbox.right <= areaMaxX &&
			bbox.top >= areaMinY &&
			bbox.bottom <= areaMaxY
		) {
			result.push(obj.id);
		}
	}

	return result;
}
