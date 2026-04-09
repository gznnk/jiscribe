import {
	calcRotatedPoint,
	degreesToRadians,
	isTransformedFrame,
	roundToDecimal,
} from "@workspace/geometry";

import { PRECISION } from "../../../../../../constants/precision";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import { normalizeRotation } from "../../../../../../utils/normalizeRotation";

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

		// 子オブジェクトのグループローカル座標系での回転角度（度数）
		const childRelativeRotationDeg =
			(child.rotation - transformRootGroupStartState.rotation + 360) % 360;

		// 最適化: 角度差が0度、90度、180度、270度（平行・直角）の場合はシンプルな計算
		let newWidth: number;
		let newHeight: number;

		if (
			Math.abs(childRelativeRotationDeg) < 0.001 ||
			Math.abs(childRelativeRotationDeg - 180) < 0.001
		) {
			// 0度または180度: 平行
			newWidth = child.width * groupScaleX;
			newHeight = child.height * groupScaleY;
		} else if (
			Math.abs(childRelativeRotationDeg - 90) < 0.001 ||
			Math.abs(childRelativeRotationDeg - 270) < 0.001
		) {
			// 90度または270度: 直角
			newWidth = child.width * groupScaleY;
			newHeight = child.height * groupScaleX;
		} else {
			// 一般的な角度: 三角関数で厳密計算
			const childRelativeRotation = degreesToRadians(childRelativeRotationDeg);
			const cosTheta = Math.cos(childRelativeRotation);
			const sinTheta = Math.sin(childRelativeRotation);

			// グループの拡縮を子オブジェクトの回転を考慮してwidth/heightに分解
			// 子オブジェクトのwidth軸方向の単位ベクトル: (cos(θ), sin(θ))
			// このベクトルがグループのscaleで変形される: (scaleX * cos(θ), scaleY * sin(θ))
			// 変形後のベクトルの長さが新しいwidthのスケール係数
			const widthScaleX = groupScaleX * cosTheta;
			const widthScaleY = groupScaleY * sinTheta;
			const widthScale = Math.sqrt(
				widthScaleX * widthScaleX + widthScaleY * widthScaleY,
			);

			// 同様にheight軸方向（width軸に対して90度回転）: (-sin(θ), cos(θ))
			const heightScaleX = groupScaleX * -sinTheta;
			const heightScaleY = groupScaleY * cosTheta;
			const heightScale = Math.sqrt(
				heightScaleX * heightScaleX + heightScaleY * heightScaleY,
			);

			newWidth = child.width * widthScale;
			newHeight = child.height * heightScale;
		}

		// 回転角度の計算（グループの回転変化を子にも適用）
		const rotationDelta =
			transformRootGroupEndState.rotation -
			transformRootGroupStartState.rotation;
		const newRotation = normalizeRotation(child.rotation + rotationDelta);

		// scaleX/scaleYの計算（1 or -1 の反転）
		const newScaleX =
			child.scaleX *
			transformRootGroupStartState.scaleX *
			transformRootGroupEndState.scaleX;
		const newScaleY =
			child.scaleY *
			transformRootGroupStartState.scaleY *
			transformRootGroupEndState.scaleY;

		const updatedChild = {
			...child,
			cx: roundToDecimal(newChildCenter.x, PRECISION.COORDINATE),
			cy: roundToDecimal(newChildCenter.y, PRECISION.COORDINATE),
			width: roundToDecimal(newWidth, PRECISION.SIZE),
			height: roundToDecimal(newHeight, PRECISION.SIZE),
			rotation: newRotation,
			scaleX: newScaleX,
			scaleY: newScaleY,
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
