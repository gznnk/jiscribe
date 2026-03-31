import {
	calcAffineTransformedPoint,
	calcOrientedFrameFromPoints,
	degreesToRadians,
	isTransformedFrame,
} from "@workspace/geometry";
import type { Point, TransformedFrame } from "@workspace/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/GroupState";

/**
 * グループの子要素すべてを含む Oriented Bounding Box (OBB) を計算
 *
 * グループの rotation を考慮した向き付きバウンディングボックスを返します。
 * 子要素はグローバル座標系で定義されており、グループの transform は表示目的のみです。
 *
 * @param objects - オブジェクトマップ
 * @param groupId - グループのID
 * @returns Oriented Bounding Box（TransformedFrame形式）、子要素がない場合はundefined
 */
export function calculateGroupOrientedBounds(
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

	// 各子要素の全コーナー点を収集
	const allPoints = frames.flatMap((frame) => getFrameCornerPoints(frame));

	// グループのtransformを取得
	const groupRotation = groupState.rotation ?? 0;
	const groupScaleX = groupState.scaleX ?? 1;
	const groupScaleY = groupState.scaleY ?? 1;

	// 点群からグループのtransformを持つOriented Bounding Boxを計算
	return calcOrientedFrameFromPoints(
		allPoints,
		groupScaleX,
		groupScaleY,
		groupRotation,
	);
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
