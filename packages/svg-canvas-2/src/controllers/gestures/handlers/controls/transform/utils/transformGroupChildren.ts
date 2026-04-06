import {
	calcRotatedPoint,
	degreesToRadians,
	isTransformedFrame,
} from "@workspace/geometry";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/GroupState";

export function transformGroupChildren(
	transformRootGroupStartState: GroupState,
	transformRootGroupEndState: GroupState,
	targetGroupStartState: GroupState,
	allObjects: Record<string, ObjectState>,
): Record<string, ObjectState> {
	const transformedObjects = {} as Record<string, ObjectState>;

	const groupScaleX =
		transformRootGroupEndState.width / transformRootGroupStartState.width;
	const groupScaleY =
		transformRootGroupEndState.height / transformRootGroupStartState.height;

	targetGroupStartState.childIds.forEach((childId) => {
		const child = allObjects[childId];

		// TODO: Polygon や Line など、TransformedFrame を持たないオブジェクトも回転できるようにする
		if (!isTransformedFrame(child)) {
			return;
		}

		const inversedChildStartCenter = calcRotatedPoint(
			child.cx,
			child.cy,
			transformRootGroupStartState.cx,
			transformRootGroupStartState.cy,
			degreesToRadians(-transformRootGroupStartState.rotation),
		);

		// グループ内部のローカル座標系（グループの回転を０にした座標系）で、子オブジェクトの中心座標のオフセットを計算
		const childOffsetXInLocalSpace =
			(inversedChildStartCenter.x - transformRootGroupStartState.cx) *
			transformRootGroupStartState.scaleX *
			transformRootGroupEndState.scaleX;
		const childOffsetYInLocalSpace =
			(inversedChildStartCenter.y - transformRootGroupStartState.cy) *
			transformRootGroupStartState.scaleY *
			transformRootGroupEndState.scaleY;

		// 子オブジェクトの新しい中心座標を計算
		const dx = childOffsetXInLocalSpace * groupScaleX;
		const dy = childOffsetYInLocalSpace * groupScaleY;

		// 絶対座標系での子オブジェクトの新しい中心座標を計算
		const newChildCenter = calcRotatedPoint(
			transformRootGroupEndState.cx + dx,
			transformRootGroupEndState.cy + dy,
			transformRootGroupEndState.cx,
			transformRootGroupEndState.cy,
			degreesToRadians(transformRootGroupEndState.rotation),
		);

		const updatedChild = {
			...child,
			cx: newChildCenter.x,
			cy: newChildCenter.y,
		};

		transformedObjects[childId] = updatedChild;

		// 子がグループの場合、さらにその子も変換させる
		if (child.type === "group") {
			const nestedTransformedChildren = transformGroupChildren(
				transformRootGroupStartState,
				transformRootGroupEndState,
				child as GroupState,
				allObjects,
			);
			Object.assign(transformedObjects, nestedTransformedChildren);
		}
	});

	return transformedObjects;
}
