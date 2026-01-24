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
	 * 固定点は bottomRight。
	 */
	private handleTopLeftDrag(
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

		// 固定点（bottomRight）をローカル空間に変換
		const startFrameFeaturePoint = calcFrameFeaturePoints(startObject);

		const inversedBottomRight = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.bottomRight.x,
			startFrameFeaturePoint.bottomRight.y,
			1,
			1,
			radians,
			startObject.cx,
			startObject.cy,
		);

		// ローカル空間でのカーソル位置から新しい寸法を計算
		const newWidth = inversedBottomRight.x - inversedCursor.x;
		const newHeight = inversedBottomRight.y - inversedCursor.y;

		// ローカル空間での新しい中心を計算
		const inversedCenterX = inversedBottomRight.x - nanToZero(newWidth / 2);
		const inversedCenterY = inversedBottomRight.y - nanToZero(newHeight / 2);

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
	 * topRight アンカーのドラッグを処理（右上コーナーからのリサイズ）。
	 * 固定点は bottomLeft。
	 */
	private handleTopRightDrag(
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

		// 固定点（bottomLeft）をローカル空間に変換
		const startFrameFeaturePoint = calcFrameFeaturePoints(startObject);

		const inversedBottomLeft = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.bottomLeft.x,
			startFrameFeaturePoint.bottomLeft.y,
			1,
			1,
			radians,
			startObject.cx,
			startObject.cy,
		);

		// ローカル空間でのカーソル位置から新しい寸法を計算
		const newWidth = inversedCursor.x - inversedBottomLeft.x;
		const newHeight = inversedBottomLeft.y - inversedCursor.y;

		// ローカル空間での新しい中心を計算
		const inversedCenterX = inversedBottomLeft.x + nanToZero(newWidth / 2);
		const inversedCenterY = inversedBottomLeft.y - nanToZero(newHeight / 2);

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
	 * bottomLeft アンカーのドラッグを処理（左下コーナーからのリサイズ）。
	 * 固定点は topRight。
	 */
	private handleBottomLeftDrag(
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

		// 固定点（topRight）をローカル空間に変換
		const startFrameFeaturePoint = calcFrameFeaturePoints(startObject);

		const inversedTopRight = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.topRight.x,
			startFrameFeaturePoint.topRight.y,
			1,
			1,
			radians,
			startObject.cx,
			startObject.cy,
		);

		// ローカル空間でのカーソル位置から新しい寸法を計算
		const newWidth = inversedTopRight.x - inversedCursor.x;
		const newHeight = inversedCursor.y - inversedTopRight.y;

		// ローカル空間での新しい中心を計算
		const inversedCenterX = inversedTopRight.x - nanToZero(newWidth / 2);
		const inversedCenterY = inversedTopRight.y + nanToZero(newHeight / 2);

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
	 * topCenter アンカーのドラッグを処理（上辺の中央からのリサイズ）。
	 * 固定点は bottomCenter。高さのみ変更し、幅は保持。
	 */
	private handleTopCenterDrag(
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

		// 固定点（bottomCenter）をローカル空間に変換
		const startFrameFeaturePoint = calcFrameFeaturePoints(startObject);

		const inversedBottomCenter = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.bottomCenter.x,
			startFrameFeaturePoint.bottomCenter.y,
			1,
			1,
			radians,
			startObject.cx,
			startObject.cy,
		);

		// ローカル空間でのカーソル位置から新しい寸法を計算
		// 幅は変更しない
		const newWidth = startObject.width;
		const newHeight = inversedBottomCenter.y - inversedCursor.y;

		// ローカル空間での新しい中心を計算
		const inversedCenterX = inversedBottomCenter.x;
		const inversedCenterY = inversedBottomCenter.y - nanToZero(newHeight / 2);

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
	 * rightCenter アンカーのドラッグを処理（右辺の中央からのリサイズ）。
	 * 固定点は leftCenter。幅のみ変更し、高さは保持。
	 */
	private handleRightCenterDrag(
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

		// 固定点（leftCenter）をローカル空間に変換
		const startFrameFeaturePoint = calcFrameFeaturePoints(startObject);

		const inversedLeftCenter = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.leftCenter.x,
			startFrameFeaturePoint.leftCenter.y,
			1,
			1,
			radians,
			startObject.cx,
			startObject.cy,
		);

		// ローカル空間でのカーソル位置から新しい寸法を計算
		// 高さは変更しない
		const newWidth = inversedCursor.x - inversedLeftCenter.x;
		const newHeight = startObject.height;

		// ローカル空間での新しい中心を計算
		const inversedCenterX = inversedLeftCenter.x + nanToZero(newWidth / 2);
		const inversedCenterY = inversedLeftCenter.y;

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
	 * bottomCenter アンカーのドラッグを処理（下辺の中央からのリサイズ）。
	 * 固定点は topCenter。高さのみ変更し、幅は保持。
	 */
	private handleBottomCenterDrag(
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

		// 固定点（topCenter）をローカル空間に変換
		const startFrameFeaturePoint = calcFrameFeaturePoints(startObject);

		const inversedTopCenter = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.topCenter.x,
			startFrameFeaturePoint.topCenter.y,
			1,
			1,
			radians,
			startObject.cx,
			startObject.cy,
		);

		// ローカル空間でのカーソル位置から新しい寸法を計算
		// 幅は変更しない
		const newWidth = startObject.width;
		const newHeight = inversedCursor.y - inversedTopCenter.y;

		// ローカル空間での新しい中心を計算
		const inversedCenterX = inversedTopCenter.x;
		const inversedCenterY = inversedTopCenter.y + nanToZero(newHeight / 2);

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
	 * leftCenter アンカーのドラッグを処理（左辺の中央からのリサイズ）。
	 * 固定点は rightCenter。幅のみ変更し、高さは保持。
	 */
	private handleLeftCenterDrag(
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

		// 固定点（rightCenter）をローカル空間に変換
		const startFrameFeaturePoint = calcFrameFeaturePoints(startObject);

		const inversedRightCenter = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.rightCenter.x,
			startFrameFeaturePoint.rightCenter.y,
			1,
			1,
			radians,
			startObject.cx,
			startObject.cy,
		);

		// ローカル空間でのカーソル位置から新しい寸法を計算
		// 高さは変更しない
		const newWidth = inversedRightCenter.x - inversedCursor.x;
		const newHeight = startObject.height;

		// ローカル空間での新しい中心を計算
		const inversedCenterX = inversedRightCenter.x - nanToZero(newWidth / 2);
		const inversedCenterY = inversedRightCenter.y;

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
