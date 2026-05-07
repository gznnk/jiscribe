import {
	calcAffineTransformedPoint,
	calcOrientedFrameFromPoints,
	degreesToRadians,
	isTransformedFrame,
} from "@workspace/geometry";
import type { Point, TransformedFrame } from "@workspace/geometry";

import { isPoly } from "../../schemas/objects/types/Poly";
import type { ObjectState } from "../objects/base/ObjectState";
import type { GroupState } from "../objects/primitives/group/GroupState";

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

	// 子要素のすべての点を収集（再帰的にネストされたグループも展開）
	const allPoints = collectChildPoints(objects, groupState.childIds);

	if (allPoints.length === 0) {
		return undefined;
	}

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
 * 子要素のすべての点を再帰的に収集
 * Frame系はコーナー点、Poly系は頂点を収集
 */
function collectChildPoints(
	objects: Record<string, ObjectState>,
	childIds: string[],
): Point[] {
	const points: Point[] = [];

	for (const childId of childIds) {
		const child = objects[childId];
		if (!child) continue;

		if (child.type === "group") {
			// グループの場合は再帰的に子を収集
			const nestedGroup = child as GroupState;
			points.push(...collectChildPoints(objects, nestedGroup.childIds));
		} else if (isTransformedFrame(child)) {
			// TransformedFrameを持つオブジェクトの場合はコーナー点を追加
			points.push(...getFrameCornerPoints(child));
		} else if (isPoly(child)) {
			// Poly系の場合はpoints配列を直接追加
			points.push(...child.points);
		}
	}

	return points;
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
