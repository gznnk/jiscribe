import { calcBoundingBox, isTransformedFrame } from "@workspace/geometry";

import { MULTI_SELECT_GROUP } from "../../../constants/multiSelectGroup";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/GroupState";

export function createMultiSelectGroup(
	selectedIds: string[],
	allObjects: Record<string, ObjectState>,
): GroupState | null {
	if (selectedIds.length <= 1) {
		return null; // 1つ以下の選択ではグループ化しない
	}

	// 再帰的にBoundingBoxを計算
	const bounds = {
		minX: Infinity,
		maxX: -Infinity,
		minY: Infinity,
		maxY: -Infinity,
	};
	collectBounds(allObjects, selectedIds, bounds);

	// 有効な点が見つからなかった場合
	if (!isFinite(bounds.minX)) {
		return null;
	}

	// BoundingBoxから中心と幅・高さを計算
	const cx = (bounds.minX + bounds.maxX) / 2;
	const cy = (bounds.minY + bounds.maxY) / 2;
	const width = bounds.maxX - bounds.minX;
	const height = bounds.maxY - bounds.minY;

	// GroupStateを返す(角度0、反転なし)
	return {
		type: "group",
		id: MULTI_SELECT_GROUP.ID,
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		childIds: selectedIds,
	} as unknown as GroupState;
}

/**
 * 再帰的に子要素を辿ってBoundingBoxを更新
 */
function collectBounds(
	objects: Record<string, ObjectState>,
	childIds: string[],
	bounds: { minX: number; maxX: number; minY: number; maxY: number },
): void {
	for (const childId of childIds) {
		const child = objects[childId];
		if (!child) continue;

		if (child.type === "group") {
			// グループの場合は再帰的に子を処理
			const nestedGroup = child as GroupState;
			collectBounds(objects, nestedGroup.childIds, bounds);
		} else if (isTransformedFrame(child)) {
			// TransformedFrameのBoundingBoxを取得して範囲を更新
			const box = calcBoundingBox(child);
			bounds.minX = Math.min(bounds.minX, box.left);
			bounds.maxX = Math.max(bounds.maxX, box.right);
			bounds.minY = Math.min(bounds.minY, box.top);
			bounds.maxY = Math.max(bounds.maxY, box.bottom);
		}
	}
}
