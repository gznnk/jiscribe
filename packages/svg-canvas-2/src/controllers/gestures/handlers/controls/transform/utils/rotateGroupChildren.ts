import {
	calcRotatedPoint,
	degreesToRadians,
	isTransformedFrame,
} from "@workspace/geometry";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/GroupState";
import { normalizeRotation } from "../../../../../../utils/normalizeRotation";

// TODO: operations として実装するべきかも
// TODO: 引数がちょっとわかりずらい
/**
 * グループの回転に伴い、子オブジェクトの位置と回転を更新する
 *
 * @param rotationRootGroupState - 回転の基準となるグループの状態
 * @param targetGroupState - 回転対象のグループの状態
 * @param endGroupRotation - グループの最終的な回転角度
 * @param allObjects - すべてのオブジェクトの状態を格納したマップ
 * @returns 回転後の子オブジェクトの状態を格納したマップ
 */
export function rotateGroupChildren(
	rotationRootGroupState: GroupState,
	targetGroupState: GroupState,
	endGroupRotation: number,
	allObjects: Record<string, ObjectState>,
): Record<string, ObjectState> {
	const rotationDelta = endGroupRotation - rotationRootGroupState.rotation;

	const rotatedObjects = {} as Record<string, ObjectState>;

	targetGroupState.childIds.forEach((childId) => {
		const child = allObjects[childId];

		// TODO: Polygon や Line など、TransformedFrame を持たないオブジェクトも回転できるようにする
		if (!isTransformedFrame(child)) {
			return;
		}

		const rotatedChildCenter = calcRotatedPoint(
			child.cx,
			child.cy,
			rotationRootGroupState.cx,
			rotationRootGroupState.cy,
			degreesToRadians(rotationDelta),
		);

		const updatedChild = {
			...child,
			cx: rotatedChildCenter.x,
			cy: rotatedChildCenter.y,
			rotation: normalizeRotation(child.rotation + rotationDelta),
		};

		rotatedObjects[childId] = updatedChild;

		// 子がグループの場合、さらにその子も回転させる
		if (child.type === "group") {
			const nestedRotatedChildren = rotateGroupChildren(
				rotationRootGroupState,
				child as GroupState,
				endGroupRotation,
				allObjects,
			);
			Object.assign(rotatedObjects, nestedRotatedChildren);
		}
	});

	return rotatedObjects;
}
