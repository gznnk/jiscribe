import {
	calcBoundingBox,
	calcFrameKeyPoints,
	calcPolyBoundingBox,
	isTransformedFrame,
} from "@workspace/geometry";
import type { TransformedFrame } from "@workspace/geometry";

import { MULTI_SELECT_GROUP } from "../../../../../constants/multiSelectGroup";
import { isPoly } from "../../../../../schemas/objects/types/Poly";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";

export function createMultiSelectGroup(
	selectedIds: string[],
	allObjects: Record<string, ObjectState>,
	existingMultiSelectGroup?: GroupState | null,
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

	// 既存のlockAspectRatioを保持、なければデフォルトtrue
	const lockAspectRatio = existingMultiSelectGroup?.lockAspectRatio ?? true;

	const frame = { cx, cy, width, height, rotation: 0, scaleX: 1, scaleY: 1 } as TransformedFrame;

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
		lockAspectRatio,
		keyPoints: calcFrameKeyPoints(frame),
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
		} else if (isPoly(child)) {
			// Poly系（Polyline, Polygon）の場合、points配列から直接バウンディングボックスを計算
			const bbox = calcPolyBoundingBox(child.points);
			if (bbox) {
				bounds.minX = Math.min(bounds.minX, bbox.left);
				bounds.maxX = Math.max(bounds.maxX, bbox.right);
				bounds.minY = Math.min(bounds.minY, bbox.top);
				bounds.maxY = Math.max(bounds.maxY, bbox.bottom);
			}
		}
	}
}
