import type { TransformedFrame } from "@workspace/geometry";
import {
	calcRotatedPoint,
	degreesToRadians,
	isTransformedFrame,
	roundToDecimal,
} from "@workspace/geometry";

import { PRECISION } from "../../../../../../constants/precision";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { TransformState } from "../../../../../../states/objects/base/TransformState";
import { isTransformState } from "../../../../../../states/objects/base/TransformState";
import { isGroupState } from "../../../../../../states/objects/primitives/GroupState";

/**
 * グループの変形に応じて子要素を変形する。
 *
 * 基本方針:
 * - 子要素の座標と角度は絶対座標系（ワールド空間）
 * - グループのローカル空間に変換 → 変形適用 → ワールド空間に戻す
 * - せん断は Rect/Ellipse では適用できないため、90度単位の角度差では適切に対応
 * - ネストしたグループにも再帰的に対応
 *
 * @param children - 変形対象の子要素配列
 * @param startGroupFrame - 変形前のグループフレーム
 * @param endGroupFrame - 変形後のグループフレーム
 * @param allObjects - すべてのオブジェクトのマップ（ネストしたグループの子要素取得用）
 * @returns 変形後の子要素配列
 */
export function transformGroupChildren(
	children: ObjectState[],
	startGroupFrame: TransformedFrame,
	endGroupFrame: TransformedFrame,
	allObjects?: Record<string, ObjectState>,
): ObjectState[] {
	const rotationDelta = endGroupFrame.rotation - startGroupFrame.rotation;

	// グループの角度（ラジアン）
	const startRadians = degreesToRadians(startGroupFrame.rotation);
	const endRadians = degreesToRadians(endGroupFrame.rotation);

	return children.map((child): ObjectState => {
		// TransformState と TransformedFrame を持つ子要素のみ変形
		if (!isTransformState(child) || !isTransformedFrame(child)) {
			return child;
		}

		const transformedChild = transformChild(
			child,
			startGroupFrame,
			endGroupFrame,
			rotationDelta,
			startRadians,
			endRadians,
			allObjects,
		);

		return transformedChild;
	});
}

/**
 * 単一の子要素を変形する。
 * 子要素がグループの場合は、その子要素も再帰的に変形する。
 */
function transformChild(
	child: ObjectState & TransformState & TransformedFrame,
	startGroupFrame: TransformedFrame,
	endGroupFrame: TransformedFrame,
	rotationDelta: number,
	startRadians: number,
	endRadians: number,
	allObjects?: Record<string, ObjectState>,
): ObjectState {
	// calculateTransformedCenter の実装を参考に、正しく座標変換を行う

	// 1. 子要素の中心を開始フレームのローカル空間に逆回転
	const inversedItemCenter = calcRotatedPoint(
		child.cx,
		child.cy,
		startGroupFrame.cx,
		startGroupFrame.cy,
		-startRadians,
	);

	// 2. ローカル空間でのオフセットを計算し、スケールを適用
	// startFrame.scaleX * endFrame.scaleX を考慮
	const dx =
		(inversedItemCenter.x - startGroupFrame.cx) *
		startGroupFrame.scaleX *
		endGroupFrame.scaleX;
	const dy =
		(inversedItemCenter.y - startGroupFrame.cy) *
		startGroupFrame.scaleY *
		endGroupFrame.scaleY;

	// 3. グループのサイズ変化（width/height の比率）を適用
	const groupScaleX = endGroupFrame.width / startGroupFrame.width;
	const groupScaleY = endGroupFrame.height / startGroupFrame.height;
	const newDx = dx * groupScaleX;
	const newDy = dy * groupScaleY;

	// 4. 新しい中心位置を計算（終了フレームのローカル空間）
	let newCenter = {
		x: endGroupFrame.cx + newDx,
		y: endGroupFrame.cy + newDy,
	};

	// 5. 終了フレームの回転を適用
	newCenter = calcRotatedPoint(
		newCenter.x,
		newCenter.y,
		endGroupFrame.cx,
		endGroupFrame.cy,
		endRadians,
	);

	// 6. 子要素のサイズと角度を計算
	const { newWidth, newHeight, newRotation } = calculateChildDimensions(
		child,
		groupScaleX,
		groupScaleY,
		rotationDelta,
		startGroupFrame.rotation,
	);

	// 5. 基本的な変形結果
	const transformedChild: ObjectState = {
		...child,
		cx: roundToDecimal(newCenter.x, PRECISION.COORDINATE),
		cy: roundToDecimal(newCenter.y, PRECISION.COORDINATE),
		width: roundToDecimal(newWidth, PRECISION.SIZE),
		height: roundToDecimal(newHeight, PRECISION.SIZE),
		rotation: roundToDecimal(newRotation, PRECISION.ROTATION),
	} as ObjectState;

	// 6. 子要素がグループの場合、その子要素も再帰的に変形
	if (isGroupState(child) && isGroupState(transformedChild) && allObjects) {
		// 変形前のグループフレーム
		const childStartFrame: TransformedFrame = {
			cx: child.cx,
			cy: child.cy,
			width: child.width,
			height: child.height,
			rotation: child.rotation,
			scaleX: child.scaleX,
			scaleY: child.scaleY,
		};

		// 変形後のグループフレーム（transformedChild は TransformedFrame の特性を持つ）
		const childEndFrame: TransformedFrame = {
			cx: roundToDecimal(newCenter.x, PRECISION.COORDINATE),
			cy: roundToDecimal(newCenter.y, PRECISION.COORDINATE),
			width: roundToDecimal(newWidth, PRECISION.SIZE),
			height: roundToDecimal(newHeight, PRECISION.SIZE),
			rotation: roundToDecimal(newRotation, PRECISION.ROTATION),
			scaleX: child.scaleX,
			scaleY: child.scaleY,
		};

		// 子グループの子要素を取得
		const grandchildren = child.childIds
			.map((id) => allObjects[id])
			.filter((obj): obj is ObjectState => obj !== undefined);

		// 再帰的に変形（結果を破棄せず、allObjects に反映させる）
		const transformedGrandchildren = transformGroupChildren(
			grandchildren,
			childStartFrame,
			childEndFrame,
			allObjects,
		);

		// 変形後の孫要素を allObjects に反映
		transformedGrandchildren.forEach((grandchild) => {
			allObjects[grandchild.id] = grandchild;
		});
	}

	return transformedChild;
}

/**
 * 子要素の新しいサイズと角度を計算する。
 *
 * 角度差が90度単位の場合は、人間の感覚に合う変形を行う。
 * （例: 90度回転時は width に scaleY を、height に scaleX を適用）
 */
function calculateChildDimensions(
	child: ObjectState & TransformState & TransformedFrame,
	scaleX: number,
	scaleY: number,
	rotationDelta: number,
	startGroupRotation: number,
): {
	newWidth: number;
	newHeight: number;
	newRotation: number;
} {
	// 子要素の新しい角度（グループの回転分を加算）
	const newRotation = (child.rotation + rotationDelta + 360) % 360;

	// グループと子要素の角度差（変形前）
	const angleDiff = Math.abs(child.rotation - startGroupRotation) % 180;

	// 90度単位の角度差の場合、幅と高さのスケールを入れ替える
	const isOrthogonal = Math.abs(angleDiff - 90) < 1; // 1度以内の誤差を許容

	let newWidth: number;
	let newHeight: number;

	if (isOrthogonal) {
		// 90度回転している場合、スケールを入れ替え
		newWidth = Math.abs(child.width * scaleY);
		newHeight = Math.abs(child.height * scaleX);
	} else {
		// 通常のスケール適用
		newWidth = Math.abs(child.width * scaleX);
		newHeight = Math.abs(child.height * scaleY);
	}

	// 最小サイズの適用
	if (child.minWidth !== undefined && newWidth < child.minWidth) {
		newWidth = child.minWidth;
	}
	if (child.minHeight !== undefined && newHeight < child.minHeight) {
		newHeight = child.minHeight;
	}

	return {
		newWidth,
		newHeight,
		newRotation,
	};
}
