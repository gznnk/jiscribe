import { calcBoundingBox } from "@workspace/geometry";
import type { BoundingBox, TransformedFrame } from "@workspace/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/GroupState";

/**
 * グループの子要素すべてを含むバウンディングボックスを計算
 *
 * @param objects - オブジェクトマップ
 * @param groupId - グループのID
 * @returns バウンディングボックス（Frame形式）、子要素がない場合はundefined
 */
export function calculateGroupBounds(
	objects: Record<string, ObjectState>,
	groupId: string,
): TransformedFrame | undefined {
	const group = objects[groupId];
	if (!group || group.type !== "group") {
		return undefined;
	}

	const groupState = group as GroupState;

	// 子要素のTransformedFrameを収集（再帰的にネストされたグループも展開）
	const frames = collectChildFrames(objects, groupState.childIds);

	if (frames.length === 0) {
		return undefined;
	}

	// 各子要素のバウンディングボックスを計算
	const boundingBoxes = frames.map((frame) => calcBoundingBox(frame));

	// すべてのバウンディングボックスを統合
	const mergedBbox = mergeBoundingBoxes(boundingBoxes);

	// BoundingBoxをTransformedFrameに変換
	return {
		cx: (mergedBbox.left + mergedBbox.right) / 2,
		cy: (mergedBbox.top + mergedBbox.bottom) / 2,
		width: mergedBbox.right - mergedBbox.left,
		height: mergedBbox.bottom - mergedBbox.top,
		rotation: 0, // バウンディングボックスは軸平行
		scaleX: 1,
		scaleY: 1,
	};
}

/**
 * 子要素のTransformedFrameを再帰的に収集
 */
function collectChildFrames(
	objects: Record<string, ObjectState>,
	childIds: string[],
): TransformedFrame[] {
	const frames: TransformedFrame[] = [];

	for (const childId of childIds) {
		const child = objects[childId];
		if (!child) continue;

		if (child.type === "group") {
			// グループの場合は再帰的に子を収集
			const nestedGroup = child as GroupState;
			frames.push(...collectChildFrames(objects, nestedGroup.childIds));
		} else if (isTransformedFrame(child)) {
			// TransformedFrameを持つオブジェクトの場合は追加
			frames.push(child);
		}
	}

	return frames;
}

/**
 * オブジェクトがTransformedFrameを持つかチェック
 */
function isTransformedFrame(obj: unknown): obj is TransformedFrame {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"cx" in obj &&
		"cy" in obj &&
		"width" in obj &&
		"height" in obj
	);
}

/**
 * 複数のBoundingBoxを統合して、すべてを含む最小のBoundingBoxを返す
 */
function mergeBoundingBoxes(boxes: BoundingBox[]): BoundingBox {
	if (boxes.length === 0) {
		return { top: 0, left: 0, right: 0, bottom: 0 };
	}

	let minLeft = Number.POSITIVE_INFINITY;
	let minTop = Number.POSITIVE_INFINITY;
	let maxRight = Number.NEGATIVE_INFINITY;
	let maxBottom = Number.NEGATIVE_INFINITY;

	for (const box of boxes) {
		minLeft = Math.min(minLeft, box.left);
		minTop = Math.min(minTop, box.top);
		maxRight = Math.max(maxRight, box.right);
		maxBottom = Math.max(maxBottom, box.bottom);
	}

	return {
		left: minLeft,
		top: minTop,
		right: maxRight,
		bottom: maxBottom,
	};
}
