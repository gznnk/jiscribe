import {
	calcAffineTransformedPoint,
	calcFrameFeaturePoints,
	calcInverseAffineTransformedPoint,
	degreesToRadians,
	isTransformedFrame,
	nanToZero,
} from "@workspace/geometry";

import type {
	CanvasGesture,
	GestureHandler,
} from "../../../../registry/GestureHandlerRegistryTypes";
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
export class TransformControlHandler
	implements GestureHandler, ControlStrategy
{
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
		// アンカー固有のハンドラーにルーティング
		switch (anchorType) {
			case "bottomRight":
				return this.handleBottomRightDrag(state, gesture);
			case "topLeft":
				return this.handleTopLeftDrag(state, gesture);
			case "topRight":
				return this.handleTopRightDrag(state, gesture);
			case "bottomLeft":
				return this.handleBottomLeftDrag(state, gesture);
			case "topCenter":
				return this.handleTopCenterDrag(state, gesture);
			case "rightCenter":
				return this.handleRightCenterDrag(state, gesture);
			case "bottomCenter":
				return this.handleBottomCenterDrag(state, gesture);
			case "leftCenter":
				return this.handleLeftCenterDrag(state, gesture);
			case "rotation":
				return this.handleRotationDrag(state, gesture);
			default:
				return state;
		}
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
	 * bottomRight アンカーのドラッグを処理（右下コーナーからのリサイズ）。
	 * これは現在実装されているアンカー。
	 */
	private handleBottomRightDrag(
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

		// 固定点（topLeft）をローカル空間に変換
		const startFrameFeaturePoint = calcFrameFeaturePoints(startObject);

		const inversedTopLeft = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.topLeft.x,
			startFrameFeaturePoint.topLeft.y,
			1,
			1,
			radians,
			startObject.cx,
			startObject.cy,
		);

		// ローカル空間でのカーソル位置から新しい寸法を計算
		const newWidth = inversedCursor.x - inversedTopLeft.x;
		const newHeight = inversedCursor.y - inversedTopLeft.y;

		// ローカル空間での新しい中心を計算
		const inversedCenterX = inversedTopLeft.x + nanToZero(newWidth / 2);
		const inversedCenterY = inversedTopLeft.y + nanToZero(newHeight / 2);

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
	 * topLeft アンカーのドラッグを処理（左上コーナーからのリサイズ）。
	 * TODO: bottomRight と同様のロジックを実装するが、固定点が逆。
	 */
	private handleTopLeftDrag(
		state: CanvasState,
		_gesture: CanvasGesture,
	): CanvasState {
		// TODO: 実装
		return state;
	}

	/**
	 * topRight アンカーのドラッグを処理（右上コーナーからのリサイズ）。
	 * TODO: 実装
	 */
	private handleTopRightDrag(
		state: CanvasState,
		_gesture: CanvasGesture,
	): CanvasState {
		// TODO: 実装
		return state;
	}

	/**
	 * bottomLeft アンカーのドラッグを処理（左下コーナーからのリサイズ）。
	 * TODO: 実装
	 */
	private handleBottomLeftDrag(
		state: CanvasState,
		_gesture: CanvasGesture,
	): CanvasState {
		// TODO: 実装
		return state;
	}

	/**
	 * topCenter アンカーのドラッグを処理（上辺の中央からのリサイズ）。
	 * TODO: 実装
	 */
	private handleTopCenterDrag(
		state: CanvasState,
		_gesture: CanvasGesture,
	): CanvasState {
		// TODO: 実装
		return state;
	}

	/**
	 * rightCenter アンカーのドラッグを処理（右辺の中央からのリサイズ）。
	 * TODO: 実装
	 */
	private handleRightCenterDrag(
		state: CanvasState,
		_gesture: CanvasGesture,
	): CanvasState {
		// TODO: 実装
		return state;
	}

	/**
	 * bottomCenter アンカーのドラッグを処理（下辺の中央からのリサイズ）。
	 * TODO: 実装
	 */
	private handleBottomCenterDrag(
		state: CanvasState,
		_gesture: CanvasGesture,
	): CanvasState {
		// TODO: 実装
		return state;
	}

	/**
	 * leftCenter アンカーのドラッグを処理（左辺の中央からのリサイズ）。
	 * TODO: 実装
	 */
	private handleLeftCenterDrag(
		state: CanvasState,
		_gesture: CanvasGesture,
	): CanvasState {
		// TODO: 実装
		return state;
	}

	/**
	 * rotation アンカーのドラッグを処理（回転ハンドル）。
	 * TODO: 実装
	 */
	private handleRotationDrag(
		state: CanvasState,
		_gesture: CanvasGesture,
	): CanvasState {
		// TODO: 実装
		return state;
	}
}
