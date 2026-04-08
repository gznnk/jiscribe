import {
	calcAffineTransformedPoint,
	calcBoundingBox,
	calcOrientedFrameFromPoints,
	degreesToRadians,
	isTransformedFrame,
} from "@workspace/geometry";
import type { Point, TransformedFrame } from "@workspace/geometry";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/GroupState";

/**
 * multiSelectGroup のバウンディングボックスを計算する（回転を考慮）
 * existingGroup が指定されている場合は、その rotation/scale を考慮した Oriented Bounding Box を計算する
 */
export function calcMultiSelectGroupBounds(
	selectedIds: string[],
	allObjects: Record<string, ObjectState>,
	existingGroup?: GroupState | null,
): { cx: number; cy: number; width: number; height: number } | null {
	if (selectedIds.length <= 1) {
		return null;
	}

	// existingGroup が指定されている場合は、rotation/scale を考慮した OBB を計算
	if (existingGroup) {
		// 子要素のTransformedFrameを収集
		const frames = collectChildFrames(allObjects, selectedIds);
		if (frames.length === 0) {
			return null;
		}

		// 各子要素の全コーナー点を収集
		const allPoints = frames.flatMap((frame) => getFrameCornerPoints(frame));

		// グループのtransformを取得
		const groupRotation = existingGroup.rotation ?? 0;
		const groupScaleX = existingGroup.scaleX ?? 1;
		const groupScaleY = existingGroup.scaleY ?? 1;

		// 点群からグループのtransformを持つOriented Bounding Boxを計算
		const obb = calcOrientedFrameFromPoints(
			allPoints,
			groupScaleX,
			groupScaleY,
			groupRotation,
		);

		if (!obb) {
			return null;
		}

		return {
			cx: obb.cx,
			cy: obb.cy,
			width: obb.width,
			height: obb.height,
		};
	}

	// existingGroup がない場合は、軸平行バウンディングボックスを計算
	const bounds = {
		minX: Infinity,
		maxX: -Infinity,
		minY: Infinity,
		maxY: -Infinity,
	};
	collectBounds(allObjects, selectedIds, bounds);

	if (!isFinite(bounds.minX)) {
		return null;
	}

	const cx = (bounds.minX + bounds.maxX) / 2;
	const cy = (bounds.minY + bounds.maxY) / 2;
	const width = bounds.maxX - bounds.minX;
	const height = bounds.maxY - bounds.minY;

	return { cx, cy, width, height };
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
			const nestedGroup = child as GroupState;
			collectBounds(objects, nestedGroup.childIds, bounds);
		} else if (isTransformedFrame(child)) {
			const box = calcBoundingBox(child);
			bounds.minX = Math.min(bounds.minX, box.left);
			bounds.maxX = Math.max(bounds.maxX, box.right);
			bounds.minY = Math.min(bounds.minY, box.top);
			bounds.maxY = Math.max(bounds.maxY, box.bottom);
		}
	}
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
			const nestedGroup = child as GroupState;
			frames.push(...collectChildFrames(objects, nestedGroup.childIds));
		} else if (isTransformedFrame(child)) {
			frames.push(child);
		}
	}

	return frames;
}

/**
 * TransformedFrame の4つのコーナー点を取得
 */
function getFrameCornerPoints(frame: TransformedFrame): Point[] {
	const { cx, cy, width, height, rotation = 0, scaleX = 1, scaleY = 1 } = frame;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	// ローカル座標系での4つのコーナー
	const localCorners: Point[] = [
		{ x: -halfWidth, y: -halfHeight }, // 左上
		{ x: halfWidth, y: -halfHeight }, // 右上
		{ x: halfWidth, y: halfHeight }, // 右下
		{ x: -halfWidth, y: halfHeight }, // 左下
	];

	// アフィン変換を適用してグローバル座標系に変換
	const radians = degreesToRadians(rotation);
	return localCorners.map((corner) =>
		calcAffineTransformedPoint(
			corner.x,
			corner.y,
			scaleX,
			scaleY,
			radians,
			cx,
			cy,
		),
	);
}
