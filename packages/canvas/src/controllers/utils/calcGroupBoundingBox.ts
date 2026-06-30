import {
	calcBoundingBox,
	calcPolyBoundingBox,
	isTransformedFrame,
	type BoundingBox,
} from "@workspace/geometry";

import { isPoly } from "../../schemas/objects/types/Poly";
import {
	isGroupState,
	type GroupState,
} from "../../states/objects/primitives/group/GroupState";

/**
 * グループの子要素を再帰的に走査してバウンディングボックスを計算する
 *
 * @param group - バウンディングボックスを計算するグループ
 * @param objects - オブジェクトマップ
 * @returns バウンディングボックス、または有効な子要素がない場合は null
 */
export function calcGroupBoundingBox(
	group: GroupState,
	objects: Record<string, unknown>,
): BoundingBox | null {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	let hasValidChild = false;

	for (const childId of group.childIds) {
		const child = objects[childId];
		if (!child) {
			continue;
		}

		let bbox;
		if (isTransformedFrame(child)) {
			bbox = calcBoundingBox(child);
		} else if (isGroupState(child)) {
			bbox = calcGroupBoundingBox(child, objects);
			if (!bbox) {
				continue;
			}
		} else if (isPoly(child)) {
			// Poly系（Polyline, Polygon）の場合、points配列からバウンディングボックスを計算
			bbox = calcPolyBoundingBox(child.points);
			if (!bbox) {
				continue;
			}
		} else {
			continue;
		}

		minX = Math.min(minX, bbox.left);
		minY = Math.min(minY, bbox.top);
		maxX = Math.max(maxX, bbox.right);
		maxY = Math.max(maxY, bbox.bottom);
		hasValidChild = true;
	}

	if (!hasValidChild) {
		return null;
	}

	return { left: minX, top: minY, right: maxX, bottom: maxY };
}
