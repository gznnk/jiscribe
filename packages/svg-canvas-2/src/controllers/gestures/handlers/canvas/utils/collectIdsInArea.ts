import {
	calcBoundingBox,
	isTransformedFrame,
	type BoundingBox,
} from "@workspace/geometry";

import { isPoly } from "../../../../../schemas/objects/types/Poly";
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

		let bbox: BoundingBox;

		if (isTransformedFrame(obj)) {
			// Frame系オブジェクト（Rect, Ellipse, Group, Sticky）
			bbox = calcBoundingBox(obj);
		} else if (isPoly(obj)) {
			// Poly系オブジェクト（Polyline, Polygon）
			// points配列から直接バウンディングボックスを計算
			let minX = Infinity;
			let minY = Infinity;
			let maxX = -Infinity;
			let maxY = -Infinity;

			for (const point of obj.points) {
				minX = Math.min(minX, point.x);
				maxX = Math.max(maxX, point.x);
				minY = Math.min(minY, point.y);
				maxY = Math.max(maxY, point.y);
			}

			bbox = { left: minX, top: minY, right: maxX, bottom: maxY };
		} else {
			// 未対応の型はスキップ
			continue;
		}

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
