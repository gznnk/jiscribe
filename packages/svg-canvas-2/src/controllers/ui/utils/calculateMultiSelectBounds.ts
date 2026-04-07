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
 * 複数選択されたオブジェクトの仮想的なバウンディングボックスを計算します。
 * この関数は calculateGroupOrientedBounds と同様の処理を行いますが、
 * 実際のグループオブジェクトを作成せず、選択されたIDリストから直接計算します。
 *
 * @param objects - オブジェクトマップ
 * @param selectedIds - 選択されたオブジェクトのIDリスト
 * @returns 仮想的な Oriented Bounding Box（TransformedFrame形式）、計算できない場合はundefined
 */
export function calculateMultiSelectBounds(
	objects: Record<string, ObjectState>,
	selectedIds: string[],
): TransformedFrame | undefined {
	if (selectedIds.length === 0) {
		return undefined;
	}

	// 選択されたオブジェクトのTransformedFrameを収集（グループも展開）
	const frames = collectSelectedFrames(objects, selectedIds);

	if (frames.length === 0) {
		return undefined;
	}

	// 各オブジェクトの全コーナー点を収集
	const allPoints = frames.flatMap((frame) => getFrameCornerPoints(frame));

	// 複数選択の場合は回転なし（rotation: 0）、スケールは1で固定
	// これにより、複数の異なる回転角度を持つオブジェクトでも統一的に扱える
	return calcOrientedFrameFromPoints(allPoints, 1, 1, 0);
}

/**
 * 選択されたオブジェクトのTransformedFrameを収集
 * グループの場合は再帰的に子要素を展開して収集
 */
function collectSelectedFrames(
	objects: Record<string, ObjectState>,
	selectedIds: string[],
): TransformedFrame[] {
	const frames: TransformedFrame[] = [];

	for (const selectedId of selectedIds) {
		const obj = objects[selectedId];
		if (!obj) continue;

		if (obj.type === "group") {
			// グループの場合は再帰的に子を収集
			const group = obj as GroupState;
			frames.push(...collectChildFrames(objects, group.childIds));
		} else if (isTransformedFrame(obj)) {
			// TransformedFrameを持つオブジェクトの場合は追加
			frames.push(obj);
		}
	}

	return frames;
}

/**
 * 子要素のTransformedFrameを再帰的に収集
 * （calculateGroupOrientedBoundsから流用）
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
 * （calculateGroupOrientedBoundsから流用）
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
