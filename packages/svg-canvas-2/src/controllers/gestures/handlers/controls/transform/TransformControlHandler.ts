import type { TransformedFrame } from "@workspace/geometry";
import {
	calcAffineTransformedPoint,
	calcFrameFeaturePoints,
	calcInverseAffineTransformedPoint,
	calcNonZeroSign,
	calcVectorAngle,
	createLinearX2yFunction,
	createLinearY2xFunction,
	degreesToRadians,
	isTransformedFrame,
	nanToZero,
	radiansToDegrees,
} from "@workspace/geometry";

import type { CanvasGesture } from "../../../../../registry/GestureHandlerRegistryTypes";
import type { CanvasState } from "../../../../../states/canvas/CanvasState";
import type { TransformState } from "../../../../../states/objects/base/TransformState";
import { isTransformState } from "../../../../../states/objects/base/TransformState";
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
		// Only handle left-click (button 0)
		if (gesture.button !== 0) {
			return state;
		}

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
		if (
			!startObject ||
			!isTransformedFrame(startObject) ||
			!isTransformState(startObject)
		) {
			return state;
		}

		const startFrame = startObject as TransformedFrame & TransformState;

		// 逆アフィン変換されたカーソル位置を計算（オブジェクトのローカル空間内）
		const radians = degreesToRadians(startFrame.rotation);

		// ワールド空間でのカーソル位置

		// 固定点をローカル空間に変換
		const startFrameFeaturePoint = calcFrameFeaturePoints(startFrame);

		const isSwapped = (startFrame.rotation + 405) % 180 > 90;

		const { scaleX, scaleY } = startFrame;
		const aspectRatio = startFrame.width / startFrame.height;
		const lockAspectRatio = startFrame.lockAspectRatio ?? false;
		const doKeepProportion = lockAspectRatio || gesture.mods.shift;

		// アンカー固有のリサイズ処理にルーティング
		const resizeResult = this.calculateResize(
			anchorType,
			startFrame,
			gesture.last.x,
			gesture.last.y,
			startFrameFeaturePoint,
			radians,
			aspectRatio,
			doKeepProportion,
			isSwapped,
			scaleX,
			scaleY,
		);

		if (!resizeResult) {
			return state;
		}

		const {
			width: newWidth,
			height: newHeight,
			inversedCenterX,
			inversedCenterY,
		} = resizeResult;

		// 新しい中心をワールド空間に変換
		const newCenter = calcAffineTransformedPoint(
			inversedCenterX,
			inversedCenterY,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);

		// 新しい寸法と中心でオブジェクトを更新
		const updatedObject = {
			...startObject,
			width: Number(Math.abs(newWidth).toFixed(2)),
			height: Number(Math.abs(newHeight).toFixed(2)),
			cx: Number(newCenter.x.toFixed(2)),
			cy: Number(newCenter.y.toFixed(2)),
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
	 * アンカータイプに応じたリサイズ計算を行う。
	 */
	private calculateResize(
		anchorType: TransformAnchorType,
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameFeaturePoint: ReturnType<typeof calcFrameFeaturePoints>,
		radians: number,
		aspectRatio: number,
		doKeepProportion: boolean,
		isSwapped: boolean,
		scaleX: number,
		scaleY: number,
	): {
		width: number;
		height: number;
		inversedCenterX: number;
		inversedCenterY: number;
	} | null {
		switch (anchorType) {
			case "bottomRight":
				return this.calculateBottomRightResize(
					startFrame,
					cursorX,
					cursorY,
					startFrameFeaturePoint,
					radians,
					aspectRatio,
					doKeepProportion,
					scaleX,
					scaleY,
				);
			case "topLeft":
				return this.calculateTopLeftResize(
					startFrame,
					cursorX,
					cursorY,
					startFrameFeaturePoint,
					radians,
					aspectRatio,
					doKeepProportion,
					scaleX,
					scaleY,
				);
			case "topRight":
				return this.calculateTopRightResize(
					startFrame,
					cursorX,
					cursorY,
					startFrameFeaturePoint,
					radians,
					aspectRatio,
					doKeepProportion,
					scaleX,
					scaleY,
				);
			case "bottomLeft":
				return this.calculateBottomLeftResize(
					startFrame,
					cursorX,
					cursorY,
					startFrameFeaturePoint,
					radians,
					aspectRatio,
					doKeepProportion,
					scaleX,
					scaleY,
				);
			case "topCenter":
				return this.calculateTopCenterResize(
					startFrame,
					cursorX,
					cursorY,
					startFrameFeaturePoint,
					radians,
					aspectRatio,
					doKeepProportion,
					isSwapped,
					scaleX,
					scaleY,
				);
			case "rightCenter":
				return this.calculateRightCenterResize(
					startFrame,
					cursorX,
					cursorY,
					startFrameFeaturePoint,
					radians,
					aspectRatio,
					doKeepProportion,
					isSwapped,
					scaleX,
					scaleY,
				);
			case "bottomCenter":
				return this.calculateBottomCenterResize(
					startFrame,
					cursorX,
					cursorY,
					startFrameFeaturePoint,
					radians,
					aspectRatio,
					doKeepProportion,
					isSwapped,
					scaleX,
					scaleY,
				);
			case "leftCenter":
				return this.calculateLeftCenterResize(
					startFrame,
					cursorX,
					cursorY,
					startFrameFeaturePoint,
					radians,
					aspectRatio,
					doKeepProportion,
					isSwapped,
					scaleX,
					scaleY,
				);
			default:
				return null;
		}
	}

	/**
	 * 右下アンカーのリサイズ計算。
	 */
	private calculateBottomRightResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameFeaturePoint: ReturnType<typeof calcFrameFeaturePoints>,
		radians: number,
		aspectRatio: number,
		doKeepProportion: boolean,
		scaleX: number,
		scaleY: number,
	) {
		// Apply drag constraints to cursor position
		const constrained = doKeepProportion
			? createLinearY2xFunction(
					startFrameFeaturePoint.bottomRight,
					startFrameFeaturePoint.topLeft,
				)(cursorX, cursorY)
			: { x: cursorX, y: cursorY };

		// カーソルをオブジェクトのローカル空間に変換（回転のみ、スケールなし）
		const inversedCursor = calcInverseAffineTransformedPoint(
			constrained.x,
			constrained.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);

		const inversedTopLeft = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.topLeft.x,
			startFrameFeaturePoint.topLeft.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);
		let newWidth = inversedCursor.x - inversedTopLeft.x;
		let newHeight: number;
		if (doKeepProportion) {
			newHeight = this.calcHeightWithAspectRatio(
				newWidth,
				aspectRatio,
				scaleX,
				scaleY,
			);
		} else {
			newHeight = inversedCursor.y - inversedTopLeft.y;
		}

		const enforced = this.enforceMinimumDimensions(
			startFrame,
			newWidth,
			newHeight,
			aspectRatio,
			doKeepProportion,
		);
		newWidth = enforced.width;
		newHeight = enforced.height;

		const inversedCenterX = inversedTopLeft.x + nanToZero(newWidth / 2);
		const inversedCenterY = inversedTopLeft.y + nanToZero(newHeight / 2);

		return {
			width: newWidth,
			height: newHeight,
			inversedCenterX,
			inversedCenterY,
		};
	}

	/**
	 * 左上アンカーのリサイズ計算。
	 */
	private calculateTopLeftResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameFeaturePoint: ReturnType<typeof calcFrameFeaturePoints>,
		radians: number,
		aspectRatio: number,
		doKeepProportion: boolean,
		scaleX: number,
		scaleY: number,
	) {
		// Apply drag constraints to cursor position
		const constrained = doKeepProportion
			? createLinearY2xFunction(
					startFrameFeaturePoint.topLeft,
					startFrameFeaturePoint.bottomRight,
				)(cursorX, cursorY)
			: { x: cursorX, y: cursorY };

		// カーソルをオブジェクトのローカル空間に変換（回転のみ、スケールなし）
		const inversedCursor = calcInverseAffineTransformedPoint(
			constrained.x,
			constrained.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);

		const inversedBottomRight = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.bottomRight.x,
			startFrameFeaturePoint.bottomRight.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);
		let newWidth = inversedBottomRight.x - inversedCursor.x;
		let newHeight: number;
		if (doKeepProportion) {
			newHeight = this.calcHeightWithAspectRatio(
				newWidth,
				aspectRatio,
				scaleX,
				scaleY,
			);
		} else {
			newHeight = inversedBottomRight.y - inversedCursor.y;
		}

		const enforced = this.enforceMinimumDimensions(
			startFrame,
			newWidth,
			newHeight,
			aspectRatio,
			doKeepProportion,
		);
		newWidth = enforced.width;
		newHeight = enforced.height;

		const inversedCenterX = inversedBottomRight.x - nanToZero(newWidth / 2);
		const inversedCenterY = inversedBottomRight.y - nanToZero(newHeight / 2);

		return {
			width: newWidth,
			height: newHeight,
			inversedCenterX,
			inversedCenterY,
		};
	}

	/**
	 * 右上アンカーのリサイズ計算。
	 */
	private calculateTopRightResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameFeaturePoint: ReturnType<typeof calcFrameFeaturePoints>,
		radians: number,
		aspectRatio: number,
		doKeepProportion: boolean,
		scaleX: number,
		scaleY: number,
	) {
		// Apply drag constraints to cursor position
		const constrained = doKeepProportion
			? createLinearY2xFunction(
					startFrameFeaturePoint.topRight,
					startFrameFeaturePoint.bottomLeft,
				)(cursorX, cursorY)
			: { x: cursorX, y: cursorY };

		// カーソルをオブジェクトのローカル空間に変換（回転のみ、スケールなし）
		const inversedCursor = calcInverseAffineTransformedPoint(
			constrained.x,
			constrained.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);

		const inversedBottomLeft = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.bottomLeft.x,
			startFrameFeaturePoint.bottomLeft.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);
		let newWidth = inversedCursor.x - inversedBottomLeft.x;
		let newHeight: number;
		if (doKeepProportion) {
			newHeight = this.calcHeightWithAspectRatio(
				newWidth,
				aspectRatio,
				scaleX,
				scaleY,
			);
		} else {
			newHeight = inversedBottomLeft.y - inversedCursor.y;
		}

		const enforced = this.enforceMinimumDimensions(
			startFrame,
			newWidth,
			newHeight,
			aspectRatio,
			doKeepProportion,
		);
		newWidth = enforced.width;
		newHeight = enforced.height;

		const inversedCenterX = inversedBottomLeft.x + nanToZero(newWidth / 2);
		const inversedCenterY = inversedBottomLeft.y - nanToZero(newHeight / 2);

		return {
			width: newWidth,
			height: newHeight,
			inversedCenterX,
			inversedCenterY,
		};
	}

	/**
	 * 左下アンカーのリサイズ計算。
	 */
	private calculateBottomLeftResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameFeaturePoint: ReturnType<typeof calcFrameFeaturePoints>,
		radians: number,
		aspectRatio: number,
		doKeepProportion: boolean,
		scaleX: number,
		scaleY: number,
	) {
		// Apply drag constraints to cursor position
		const constrained = doKeepProportion
			? createLinearY2xFunction(
					startFrameFeaturePoint.bottomLeft,
					startFrameFeaturePoint.topRight,
				)(cursorX, cursorY)
			: { x: cursorX, y: cursorY };

		// カーソルをオブジェクトのローカル空間に変換（回転のみ、スケールなし）
		const inversedCursor = calcInverseAffineTransformedPoint(
			constrained.x,
			constrained.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);

		const inversedTopRight = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.topRight.x,
			startFrameFeaturePoint.topRight.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);
		let newWidth = inversedTopRight.x - inversedCursor.x;
		let newHeight: number;
		if (doKeepProportion) {
			newHeight = this.calcHeightWithAspectRatio(
				newWidth,
				aspectRatio,
				scaleX,
				scaleY,
			);
		} else {
			newHeight = inversedCursor.y - inversedTopRight.y;
		}

		const enforced = this.enforceMinimumDimensions(
			startFrame,
			newWidth,
			newHeight,
			aspectRatio,
			doKeepProportion,
		);
		newWidth = enforced.width;
		newHeight = enforced.height;

		const inversedCenterX = inversedTopRight.x - nanToZero(newWidth / 2);
		const inversedCenterY = inversedTopRight.y + nanToZero(newHeight / 2);

		return {
			width: newWidth,
			height: newHeight,
			inversedCenterX,
			inversedCenterY,
		};
	}

	/**
	 * 上中央アンカーのリサイズ計算。
	 */
	private calculateTopCenterResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameFeaturePoint: ReturnType<typeof calcFrameFeaturePoints>,
		radians: number,
		aspectRatio: number,
		doKeepProportion: boolean,
		isSwapped: boolean,
		scaleX: number,
		scaleY: number,
	) {
		// Apply drag constraints to cursor position
		const constrained = !isSwapped
			? createLinearY2xFunction(
					startFrameFeaturePoint.bottomCenter,
					startFrameFeaturePoint.topCenter,
				)(cursorX, cursorY)
			: createLinearX2yFunction(
					startFrameFeaturePoint.bottomCenter,
					startFrameFeaturePoint.topCenter,
				)(cursorX, cursorY);

		// カーソルをオブジェクトのローカル空間に変換（回転のみ、スケールなし）
		const inversedCursor = calcInverseAffineTransformedPoint(
			constrained.x,
			constrained.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);

		const inversedBottomCenter = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.bottomCenter.x,
			startFrameFeaturePoint.bottomCenter.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);
		const newHeight = inversedBottomCenter.y - inversedCursor.y;
		let newWidth: number;
		if (doKeepProportion) {
			newWidth = this.calcWidthWithAspectRatio(
				newHeight,
				aspectRatio,
				scaleX,
				scaleY,
			);
		} else {
			newWidth = startFrame.width;
		}

		const enforced = this.enforceMinimumDimensions(
			startFrame,
			newWidth,
			newHeight,
			aspectRatio,
			doKeepProportion,
		);
		const finalWidth = enforced.width;
		const finalHeight = enforced.height;

		const inversedCenterX = inversedBottomCenter.x;
		const inversedCenterY = inversedBottomCenter.y - nanToZero(finalHeight / 2);

		return {
			width: finalWidth,
			height: finalHeight,
			inversedCenterX,
			inversedCenterY,
		};
	}

	/**
	 * 右中央アンカーのリサイズ計算。
	 */
	private calculateRightCenterResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameFeaturePoint: ReturnType<typeof calcFrameFeaturePoints>,
		radians: number,
		aspectRatio: number,
		doKeepProportion: boolean,
		isSwapped: boolean,
		scaleX: number,
		scaleY: number,
	) {
		// Apply drag constraints to cursor position
		const constrained = !isSwapped
			? createLinearX2yFunction(
					startFrameFeaturePoint.leftCenter,
					startFrameFeaturePoint.rightCenter,
				)(cursorX, cursorY)
			: createLinearY2xFunction(
					startFrameFeaturePoint.leftCenter,
					startFrameFeaturePoint.rightCenter,
				)(cursorX, cursorY);

		// カーソルをオブジェクトのローカル空間に変換（回転のみ、スケールなし）
		const inversedCursor = calcInverseAffineTransformedPoint(
			constrained.x,
			constrained.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);

		const inversedLeftCenter = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.leftCenter.x,
			startFrameFeaturePoint.leftCenter.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);
		let newWidth = inversedCursor.x - inversedLeftCenter.x;
		let newHeight: number;
		if (doKeepProportion) {
			newHeight = this.calcHeightWithAspectRatio(
				newWidth,
				aspectRatio,
				scaleX,
				scaleY,
			);
		} else {
			newHeight = startFrame.height;
		}

		const enforced = this.enforceMinimumDimensions(
			startFrame,
			newWidth,
			newHeight,
			aspectRatio,
			doKeepProportion,
		);
		newWidth = enforced.width;
		newHeight = enforced.height;

		const inversedCenterX = inversedLeftCenter.x + nanToZero(newWidth / 2);
		const inversedCenterY = inversedLeftCenter.y;

		return {
			width: newWidth,
			height: newHeight,
			inversedCenterX,
			inversedCenterY,
		};
	}

	/**
	 * 下中央アンカーのリサイズ計算。
	 */
	private calculateBottomCenterResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameFeaturePoint: ReturnType<typeof calcFrameFeaturePoints>,
		radians: number,
		aspectRatio: number,
		doKeepProportion: boolean,
		isSwapped: boolean,
		scaleX: number,
		scaleY: number,
	) {
		// Apply drag constraints to cursor position
		const constrained = !isSwapped
			? createLinearY2xFunction(
					startFrameFeaturePoint.bottomCenter,
					startFrameFeaturePoint.topCenter,
				)(cursorX, cursorY)
			: createLinearX2yFunction(
					startFrameFeaturePoint.bottomCenter,
					startFrameFeaturePoint.topCenter,
				)(cursorX, cursorY);

		// カーソルをオブジェクトのローカル空間に変換（回転のみ、スケールなし）
		const inversedCursor = calcInverseAffineTransformedPoint(
			constrained.x,
			constrained.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);

		const inversedTopCenter = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.topCenter.x,
			startFrameFeaturePoint.topCenter.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);
		const newHeight = inversedCursor.y - inversedTopCenter.y;
		let newWidth: number;
		if (doKeepProportion) {
			newWidth = this.calcWidthWithAspectRatio(
				newHeight,
				aspectRatio,
				scaleX,
				scaleY,
			);
		} else {
			newWidth = startFrame.width;
		}

		const enforced = this.enforceMinimumDimensions(
			startFrame,
			newWidth,
			newHeight,
			aspectRatio,
			doKeepProportion,
		);
		const finalWidth = enforced.width;
		const finalHeight = enforced.height;

		const inversedCenterX = inversedTopCenter.x;
		const inversedCenterY = inversedTopCenter.y + nanToZero(finalHeight / 2);

		return {
			width: finalWidth,
			height: finalHeight,
			inversedCenterX,
			inversedCenterY,
		};
	}

	/**
	 * 左中央アンカーのリサイズ計算。
	 */
	private calculateLeftCenterResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameFeaturePoint: ReturnType<typeof calcFrameFeaturePoints>,
		radians: number,
		aspectRatio: number,
		doKeepProportion: boolean,
		isSwapped: boolean,
		scaleX: number,
		scaleY: number,
	) {
		// Apply drag constraints to cursor position
		const constrained = !isSwapped
			? createLinearX2yFunction(
					startFrameFeaturePoint.leftCenter,
					startFrameFeaturePoint.rightCenter,
				)(cursorX, cursorY)
			: createLinearY2xFunction(
					startFrameFeaturePoint.leftCenter,
					startFrameFeaturePoint.rightCenter,
				)(cursorX, cursorY);

		// カーソルをオブジェクトのローカル空間に変換（回転のみ、スケールなし）
		const inversedCursor = calcInverseAffineTransformedPoint(
			constrained.x,
			constrained.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);

		const inversedRightCenter = calcInverseAffineTransformedPoint(
			startFrameFeaturePoint.rightCenter.x,
			startFrameFeaturePoint.rightCenter.y,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);
		let newWidth = inversedRightCenter.x - inversedCursor.x;
		let newHeight: number;
		if (doKeepProportion) {
			newHeight = this.calcHeightWithAspectRatio(
				newWidth,
				aspectRatio,
				scaleX,
				scaleY,
			);
		} else {
			newHeight = startFrame.height;
		}

		const enforced = this.enforceMinimumDimensions(
			startFrame,
			newWidth,
			newHeight,
			aspectRatio,
			doKeepProportion,
		);
		newWidth = enforced.width;
		newHeight = enforced.height;

		const inversedCenterX = inversedRightCenter.x - nanToZero(newWidth / 2);
		const inversedCenterY = inversedRightCenter.y;

		return {
			width: newWidth,
			height: newHeight,
			inversedCenterX,
			inversedCenterY,
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

	/**
	 * Calculates the height that maintains the original aspect ratio.
	 */
	private calcHeightWithAspectRatio(
		width: number,
		aspectRatio: number,
		scaleX: number,
		scaleY: number,
	) {
		return nanToZero(width / aspectRatio) * scaleX * scaleY;
	}

	/**
	 * Calculates the width that maintains the original aspect ratio.
	 */
	private calcWidthWithAspectRatio(
		height: number,
		aspectRatio: number,
		scaleX: number,
		scaleY: number,
	) {
		return nanToZero(height * aspectRatio) * scaleX * scaleY;
	}

	/**
	 * Checks if dimensions are below minimum values and adjusts them.
	 */
	private enforceMinimumDimensions(
		startFrame: TransformedFrame & TransformState,
		newWidth: number,
		newHeight: number,
		aspectRatio: number | undefined,
		shouldKeepProportion: boolean | undefined,
	): { width: number; height: number } {
		const minWidth = startFrame.minWidth ?? 0;
		const minHeight = startFrame.minHeight ?? 0;

		const absWidth = Math.abs(newWidth);
		const absHeight = Math.abs(newHeight);
		const widthSign = calcNonZeroSign(newWidth);
		const heightSign = calcNonZeroSign(newHeight);

		// Check if either dimension is below minimum
		const widthBelowMin = absWidth < minWidth;
		const heightBelowMin = absHeight < minHeight;

		if (!widthBelowMin && !heightBelowMin) {
			return { width: newWidth, height: newHeight };
		}

		if (!shouldKeepProportion || !aspectRatio) {
			return {
				width: widthBelowMin ? minWidth * widthSign : newWidth,
				height: heightBelowMin ? minHeight * heightSign : newHeight,
			};
		}

		const minWidthFromHeight = minHeight * aspectRatio;
		const minHeightFromWidth = minWidth / aspectRatio;

		let adjustedWidth: number;
		let adjustedHeight: number;

		if (minWidthFromHeight > minWidth) {
			adjustedHeight = minHeight * heightSign;
			adjustedWidth = minWidthFromHeight * widthSign;
		} else {
			adjustedWidth = minWidth * widthSign;
			adjustedHeight = minHeightFromWidth * heightSign;
		}

		return {
			width: adjustedWidth,
			height: adjustedHeight,
		};
	}
}
