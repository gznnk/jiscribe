import {
	calcAffineTransformedPoint,
	calcFrameFeaturePoints,
	calcInverseAffineTransformedPoint,
	calcVectorAngle,
	degreesToRadians,
	isTransformedFrame,
	nanToZero,
	radiansToDegrees,
} from "@workspace/geometry";

import type { CanvasGesture } from "../../../../registry/GestureHandlerRegistryTypes";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import type { ControlStrategy } from "../ControlEventHandler";

/**
 * Transform control のアンカータイプ。
 * TransformControls.tsx の data-id 値に対応する:
 * "transform-control:<anchorType>"
 */
export type TransformAnchorType =
	| "topLeft"
	| "topCenter"
	| "topRight"
	| "rightCenter"
	| "bottomRight"
	| "bottomCenter"
	| "bottomLeft"
	| "leftCenter"
	| "rotation";

/**
 * Transform control の操作（リサイズと回転）を処理する。
 *
 * Control ID フォーマット: "transform-control:<anchorType>"
 * 例: "transform-control:bottomRight"
 */
export class TransformControlHandler implements ControlStrategy {
	readonly controlType = "transform-control";

	supports(gesture: CanvasGesture): boolean {
		if (gesture.targetKind !== "control") {
			return false;
		}

		const targetId = gesture.targetId;
		if (!targetId) {
			return false;
		}

		// transform-control かどうかをチェック
		return targetId.startsWith("transform-control:");
	}

	handle(state: CanvasState, gesture: CanvasGesture): CanvasState {
		const targetControlId = gesture.targetId;
		if (!targetControlId) {
			return state;
		}

		// "transform-control:bottomRight" からアンカータイプをパース
		const parts = targetControlId.split(":");
		if (parts.length !== 2 || parts[0] !== "transform-control") {
			return state;
		}

		const anchorType = parts[1] as TransformAnchorType;

		// ジェスチャータイプに応じて適切なハンドラーにルーティング
		let nextState = state;

		if (gesture.type === "dragStart") {
			nextState = this.handleDragStart(nextState, gesture, anchorType);
		} else if (gesture.type === "drag") {
			nextState = this.handleDrag(nextState, gesture, anchorType);
		} else if (gesture.type === "dragEnd") {
			nextState = this.handleDragEnd(nextState, gesture, anchorType);
		}

		return nextState;
	}

	/**
	 * Transform control アンカーでのドラッグ開始を処理する。
	 */
	private handleDragStart(
		state: CanvasState,
		_gesture: CanvasGesture,
		_anchorType: TransformAnchorType,
	): CanvasState {
		// 状態を保存するだけ（handleGesture で管理される）
		return state;
	}

	/**
	 * Transform control アンカーでのドラッグを処理する。
	 */
	private handleDrag(
		state: CanvasState,
		gesture: CanvasGesture,
		anchorType: TransformAnchorType,
	): CanvasState {
		// 回転は別処理
		if (anchorType === "rotation") {
			return this.handleRotationDrag(state, gesture);
		}

		// リサイズ処理の共通前処理
		// 選択されているオブジェクトを取得（正確に1つであるべき）
		if (state.selectedIds.length !== 1) {
			return state;
		}

		const selectedId = state.selectedIds[0];
		const eventStartState = state.eventStartState;
		if (!eventStartState) {
			return state;
		}
		const startObject = eventStartState.objects[selectedId];
		if (!startObject || !isTransformedFrame(startObject)) {
			return state;
		}

		// 逆アフィン変換されたカーソル位置を計算（オブジェクトのローカル空間内）
		const radians = degreesToRadians(startObject.rotation);

		// ワールド空間でのカーソル位置
		const cursorX = gesture.last.x;
		const cursorY = gesture.last.y;

		// カーソルをオブジェクトのローカル空間に変換（回転のみ、スケールなし）
		const inversedCursor = calcInverseAffineTransformedPoint(
			cursorX,
			cursorY,
			1,
			1,
			radians,
			startObject.cx,
			startObject.cy,
		);

		// 固定点をローカル空間に変換
		const startFrameFeaturePoint = calcFrameFeaturePoints(startObject);

		// アンカー固有のリサイズ処理にルーティング
		let newWidth: number;
		let newHeight: number;
		let inversedCenterX: number;
		let inversedCenterY: number;

		switch (anchorType) {
			case "bottomRight": {
				const inversedTopLeft = calcInverseAffineTransformedPoint(
					startFrameFeaturePoint.topLeft.x,
					startFrameFeaturePoint.topLeft.y,
					1,
					1,
					radians,
					startObject.cx,
					startObject.cy,
				);
				newWidth = inversedCursor.x - inversedTopLeft.x;
				newHeight = inversedCursor.y - inversedTopLeft.y;
				inversedCenterX = inversedTopLeft.x + nanToZero(newWidth / 2);
				inversedCenterY = inversedTopLeft.y + nanToZero(newHeight / 2);
				break;
			}
			case "topLeft": {
				const inversedBottomRight = calcInverseAffineTransformedPoint(
					startFrameFeaturePoint.bottomRight.x,
					startFrameFeaturePoint.bottomRight.y,
					1,
					1,
					radians,
					startObject.cx,
					startObject.cy,
				);
				newWidth = inversedBottomRight.x - inversedCursor.x;
				newHeight = inversedBottomRight.y - inversedCursor.y;
				inversedCenterX = inversedBottomRight.x - nanToZero(newWidth / 2);
				inversedCenterY = inversedBottomRight.y - nanToZero(newHeight / 2);
				break;
			}
			case "topRight": {
				const inversedBottomLeft = calcInverseAffineTransformedPoint(
					startFrameFeaturePoint.bottomLeft.x,
					startFrameFeaturePoint.bottomLeft.y,
					1,
					1,
					radians,
					startObject.cx,
					startObject.cy,
				);
				newWidth = inversedCursor.x - inversedBottomLeft.x;
				newHeight = inversedBottomLeft.y - inversedCursor.y;
				inversedCenterX = inversedBottomLeft.x + nanToZero(newWidth / 2);
				inversedCenterY = inversedBottomLeft.y - nanToZero(newHeight / 2);
				break;
			}
			case "bottomLeft": {
				const inversedTopRight = calcInverseAffineTransformedPoint(
					startFrameFeaturePoint.topRight.x,
					startFrameFeaturePoint.topRight.y,
					1,
					1,
					radians,
					startObject.cx,
					startObject.cy,
				);
				newWidth = inversedTopRight.x - inversedCursor.x;
				newHeight = inversedCursor.y - inversedTopRight.y;
				inversedCenterX = inversedTopRight.x - nanToZero(newWidth / 2);
				inversedCenterY = inversedTopRight.y + nanToZero(newHeight / 2);
				break;
			}
			case "topCenter": {
				const inversedBottomCenter = calcInverseAffineTransformedPoint(
					startFrameFeaturePoint.bottomCenter.x,
					startFrameFeaturePoint.bottomCenter.y,
					1,
					1,
					radians,
					startObject.cx,
					startObject.cy,
				);
				newWidth = startObject.width;
				newHeight = inversedBottomCenter.y - inversedCursor.y;
				inversedCenterX = inversedBottomCenter.x;
				inversedCenterY = inversedBottomCenter.y - nanToZero(newHeight / 2);
				break;
			}
			case "rightCenter": {
				const inversedLeftCenter = calcInverseAffineTransformedPoint(
					startFrameFeaturePoint.leftCenter.x,
					startFrameFeaturePoint.leftCenter.y,
					1,
					1,
					radians,
					startObject.cx,
					startObject.cy,
				);
				newWidth = inversedCursor.x - inversedLeftCenter.x;
				newHeight = startObject.height;
				inversedCenterX = inversedLeftCenter.x + nanToZero(newWidth / 2);
				inversedCenterY = inversedLeftCenter.y;
				break;
			}
			case "bottomCenter": {
				const inversedTopCenter = calcInverseAffineTransformedPoint(
					startFrameFeaturePoint.topCenter.x,
					startFrameFeaturePoint.topCenter.y,
					1,
					1,
					radians,
					startObject.cx,
					startObject.cy,
				);
				newWidth = startObject.width;
				newHeight = inversedCursor.y - inversedTopCenter.y;
				inversedCenterX = inversedTopCenter.x;
				inversedCenterY = inversedTopCenter.y + nanToZero(newHeight / 2);
				break;
			}
			case "leftCenter": {
				const inversedRightCenter = calcInverseAffineTransformedPoint(
					startFrameFeaturePoint.rightCenter.x,
					startFrameFeaturePoint.rightCenter.y,
					1,
					1,
					radians,
					startObject.cx,
					startObject.cy,
				);
				newWidth = inversedRightCenter.x - inversedCursor.x;
				newHeight = startObject.height;
				inversedCenterX = inversedRightCenter.x - nanToZero(newWidth / 2);
				inversedCenterY = inversedRightCenter.y;
				break;
			}
			default:
				return state;
		}

		// 新しい中心をワールド空間に変換
		const newCenter = calcAffineTransformedPoint(
			inversedCenterX,
			inversedCenterY,
			1,
			1,
			radians,
			startObject.cx,
			startObject.cy,
		);

		// 新しい寸法と中心でオブジェクトを更新
		const updatedObject = {
			...startObject,
			width: Math.abs(newWidth),
			height: Math.abs(newHeight),
			cx: newCenter.x,
			cy: newCenter.y,
		};

		// eventStartState から更新されたオブジェクトマップを作成
		const updatedObjects = {
			...eventStartState.objects,
			[selectedId]: updatedObject,
		};

		return {
			...state,
			objects: updatedObjects,
		};
	}

	/**
	 * Transform control アンカーでのドラッグ終了を処理する。
	 */
	private handleDragEnd(
		state: CanvasState,
		gesture: CanvasGesture,
		anchorType: TransformAnchorType,
	): CanvasState {
		// ドラッグハンドラーをもう一度呼び出して確定
		return this.handleDrag(state, gesture, anchorType);
	}

	/**
	 * rotation アンカーのドラッグを処理（回転ハンドル）。
	 */
	private handleRotationDrag(
		state: CanvasState,
		gesture: CanvasGesture,
	): CanvasState {
		// 選択されているオブジェクトを取得（正確に1つであるべき）
		if (state.selectedIds.length !== 1) {
			return state;
		}

		const selectedId = state.selectedIds[0];
		const eventStartState = state.eventStartState;
		if (!eventStartState) {
			return state;
		}
		const startObject = eventStartState.objects[selectedId];
		if (!startObject || !isTransformedFrame(startObject)) {
			return state;
		}

		// ワールド空間でのカーソル位置
		const cursorX = gesture.last.x;
		const cursorY = gesture.last.y;

		// 中心点からカーソルへのベクトル角度を計算
		const radian = calcVectorAngle(
			startObject.cx,
			startObject.cy,
			cursorX,
			cursorY,
		);

		// 回転ポイントの基準角度を計算（右上方向）
		const rotatePointRadian = calcVectorAngle(
			startObject.cx,
			startObject.cy,
			startObject.cx + startObject.width,
			startObject.cy - startObject.height,
		);

		// 新しい回転角度を計算（0-360度）
		const newRotation =
			Math.round(radiansToDegrees(radian - rotatePointRadian) + 360) % 360;

		// 回転のみを更新したオブジェクトを作成
		const updatedObject = {
			...startObject,
			rotation: newRotation,
		};

		// eventStartState から更新されたオブジェクトマップを作成
		const updatedObjects = {
			...eventStartState.objects,
			[selectedId]: updatedObject,
		};

		return {
			...state,
			objects: updatedObjects,
		};
	}
}
