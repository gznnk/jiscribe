import {
	calcInverseAffineTransformedPoint,
	degreesToRadians,
	isTransformedFrame,
	roundToDecimal,
} from "@workspace/geometry";
import type { TransformedFrame } from "@workspace/geometry";

import { transformGroupChildren } from "./transformGroupChildren";
import { PRECISION } from "../../../../../../constants/precision";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/GroupState";

/**
 * 仮想グループの変形を選択された各オブジェクトに分配します。
 *
 * この関数は、複数選択時に仮想的なバウンディングボックスが変形された際、
 * その変形を各選択オブジェクトに適用します。
 *
 * アプローチ:
 * 1. 各オブジェクトの中心座標を、変形前の仮想グループのローカル座標系に変換
 * 2. スケール比を適用
 * 3. 変形後の仮想グループの座標系に変換して新しい位置を計算
 * 4. 各オブジェクトのサイズもスケール比に応じて変更
 *
 * @param selectedIds - 選択されたオブジェクトのIDリスト
 * @param startObjects - 変形開始時のオブジェクトマップ（eventStartState.objects）
 * @param startVirtualBounds - 変形開始時の仮想バウンディングボックス
 * @param endVirtualBounds - 変形後の仮想バウンディングボックス
 * @returns 更新されたオブジェクトマップ
 */
export function distributeTransformToSelection(
	selectedIds: string[],
	startObjects: Record<string, ObjectState>,
	startVirtualBounds: TransformedFrame,
	endVirtualBounds: TransformedFrame,
): Record<string, ObjectState> {
	const updatedObjects = { ...startObjects };

	// スケール比を計算
	const scaleX = endVirtualBounds.width / startVirtualBounds.width;
	const scaleY = endVirtualBounds.height / startVirtualBounds.height;

	// 仮想グループは常に rotation: 0 で計算されているため、回転の変化はない
	const startRadians = degreesToRadians(startVirtualBounds.rotation);

	for (const selectedId of selectedIds) {
		const startObj = startObjects[selectedId];
		if (!startObj || !isTransformedFrame(startObj)) {
			continue;
		}

		const startFrame = startObj as TransformedFrame;

		// 1. オブジェクトの中心座標を、変形前の仮想グループのローカル座標系に変換
		const localStart = calcInverseAffineTransformedPoint(
			startFrame.cx,
			startFrame.cy,
			1,
			1,
			startRadians,
			startVirtualBounds.cx,
			startVirtualBounds.cy,
		);

		// 2. スケール比を適用（ローカル座標系でのオフセットをスケール）
		const scaledLocalX = localStart.x * scaleX;
		const scaledLocalY = localStart.y * scaleY;

		// 3. 変形後の仮想グループの座標系に変換（回転 + 平行移動）
		// 仮想グループは rotation: 0 なので、単純な平行移動
		const newCx = endVirtualBounds.cx + scaledLocalX;
		const newCy = endVirtualBounds.cy + scaledLocalY;

		// 4. オブジェクトのサイズをスケール
		const newWidth = startFrame.width * Math.abs(scaleX);
		const newHeight = startFrame.height * Math.abs(scaleY);

		// 5. スケールの符号を更新（反転処理）
		const newScaleX = startFrame.scaleX * (scaleX < 0 ? -1 : 1);
		const newScaleY = startFrame.scaleY * (scaleY < 0 ? -1 : 1);

		// 更新されたオブジェクトを作成
		const updatedObject = {
			...startObj,
			cx: roundToDecimal(newCx, PRECISION.COORDINATE),
			cy: roundToDecimal(newCy, PRECISION.COORDINATE),
			width: roundToDecimal(newWidth, PRECISION.SIZE),
			height: roundToDecimal(newHeight, PRECISION.SIZE),
			scaleX: newScaleX,
			scaleY: newScaleY,
			// 回転は変更しない（仮想グループは回転なしのため）
		};

		updatedObjects[selectedId] = updatedObject;

		// グループの場合、子オブジェクトも変換する
		if (updatedObject.type === "group") {
			const groupChildrenUpdates = transformGroupChildren(
				startObj as GroupState,
				updatedObject as GroupState,
				updatedObject as GroupState,
				startObjects,
			);
			Object.assign(updatedObjects, groupChildrenUpdates);
		}
	}

	return updatedObjects;
}
