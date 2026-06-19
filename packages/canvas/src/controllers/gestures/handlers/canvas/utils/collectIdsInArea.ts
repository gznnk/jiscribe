import {
	calcBoundingBox,
	calcPolyBoundingBox,
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
		if (!obj) {
			continue;
		}

		let bbox: BoundingBox | null;

		if (isTransformedFrame(obj)) {
			// Frame系オブジェクト（Rect, Ellipse, Group, Sticky）
			bbox = calcBoundingBox(obj);
		} else if (isPoly(obj) && obj.type !== "connector") {
			// Poly系オブジェクト（Polyline, Polygon）
			bbox = calcPolyBoundingBox(obj.points);
		} else {
			// 未対応の型はスキップ
			continue;
		}

		// nullチェック（空のPolyなど）
		if (!bbox) {
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
