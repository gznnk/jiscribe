import type { FrameKeyPoints, TransformedFrame } from "@workspace/geometry";
import {
	calcAffineTransformedPoint,
	calcFrameKeyPoints,
	calcInverseAffineTransformedPoint,
	calcNonZeroSign,
	calcVectorAngle,
	createLinearX2yFunction,
	createLinearY2xFunction,
	degreesToRadians,
	isTransformedFrame,
	nanToZero,
	radiansToDegrees,
	roundToDecimal,
} from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import { updateAffectedGroupBounds } from "../../../../../operations/objects/utils/updateAffectedGroupBounds";
import type { CanvasEvent } from "../../../../../registry/GestureHandlerRegistryTypes";
import type { CanvasState } from "../../../../../states/canvas/CanvasState";
import { hasFrameKeyPoints } from "../../../../../states/objects/base/FrameWithKeyPoints";
import type { TransformState } from "../../../../../states/objects/base/TransformState";
import { isTransformState } from "../../../../../states/objects/base/TransformState";
import type { GroupState } from "../../../../../states/objects/primitives/GroupState";
import { calculateMultiSelectBounds } from "../../../../ui/utils/calculateMultiSelectBounds";
import type { ControlStrategy } from "../ControlEventHandler";
import { distributeTransformToSelection } from "./utils/distributeTransformToSelection";
import { rotateGroupChildren } from "./utils/rotateGroupChildren";
import { transformGroupChildren } from "./utils/transformGroupChildren";
import { updateAffectedGroupBoundsFromRoot } from "./utils/updateAffectedGroupBoundsFromRoot";

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

	supports(event: CanvasEvent): boolean {
		if (event.targetKind !== "control") {
			return false;
		}

		const targetId = event.targetId;
		if (!targetId) {
			return false;
		}

		// transform-control かどうかをチェック
		return targetId.startsWith("transform-control:");
	}

	handle(state: CanvasState, event: CanvasEvent): CanvasState {
		// Only handle left-click (button 0)
		if (event.button !== 0) {
			return state;
		}

		const targetControlId = event.targetId;
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

		if (event.type === "dragStart") {
			nextState = this.handleDragStart(nextState, event, anchorType);
		} else if (event.type === "drag") {
			nextState = this.handleDrag(nextState, event, anchorType);
		} else if (event.type === "dragEnd") {
			nextState = this.handleDragEnd(nextState, event, anchorType);
		}

		return nextState;
	}

	/**
	 * Transform control アンカーでのドラッグ開始を処理する。
	 */
	private handleDragStart(
		state: CanvasState,
		_event: CanvasEvent,
		_anchorType: TransformAnchorType,
	): CanvasState {
		return {
			...state,
			edgeScrollEnabled: true,
		};
	}

	/**
	 * Transform control アンカーでのドラッグを処理する。
	 */
	private handleDrag(
		state: CanvasState,
		event: CanvasEvent,
		anchorType: TransformAnchorType,
	): CanvasState {
		// 回転は複数選択では非対応（TransformControlsLayerで表示しない）
		if (anchorType === "rotation") {
			return this.handleRotationDrag(state, event);
		}

		// 複数選択の場合は仮想グループの変形として処理
		if (state.selectedIds.length > 1) {
			return this.handleMultiSelectDrag(state, event, anchorType);
		}

		// 単一選択の場合は既存のロジック
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

		// キャッシュがあればそれを使用、なければ計算
		const startFrameKeyPoints: FrameKeyPoints = hasFrameKeyPoints(startFrame)
			? startFrame.keyPoints
			: calcFrameKeyPoints(startFrame);

		const isSwapped = (startFrame.rotation + 405) % 180 > 90;

		const { scaleX, scaleY } = startFrame;
		const aspectRatio = startFrame.width / startFrame.height;
		const lockAspectRatio = startFrame.lockAspectRatio ?? false;
		const doKeepProportion = lockAspectRatio || event.mods.shift;

		// アンカー固有のリサイズ処理にルーティング
		const resizeResult = this.calculateResize(
			anchorType,
			startFrame,
			event.last.x,
			event.last.y,
			startFrameKeyPoints,
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
			scaleX: newScaleX,
			scaleY: newScaleY,
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
			width: roundToDecimal(Math.abs(newWidth), PRECISION.SIZE),
			height: roundToDecimal(Math.abs(newHeight), PRECISION.SIZE),
			cx: roundToDecimal(newCenter.x, PRECISION.COORDINATE),
			cy: roundToDecimal(newCenter.y, PRECISION.COORDINATE),
			scaleX: newScaleX,
			scaleY: newScaleY,
		};

		// eventStartState から更新されたオブジェクトマップを作成
		const updatedObjects = {
			...eventStartState.objects,
			[selectedId]: updatedObject,
		};

		// グループの場合、子オブジェクトも変換する
		if (updatedObject.type === "group") {
			const groupChildrenUpdates = transformGroupChildren(
				startObject as GroupState,
				updatedObject as GroupState,
				updatedObject as GroupState,
				eventStartState.objects,
			);
			Object.assign(updatedObjects, groupChildrenUpdates);
		}

		const nextState = {
			...state,
			objects: updatedObjects,
		};

		// グループの場合、または親グループがある場合、rootから子方向へグループ境界を更新
		if (updatedObject.type === "group" || updatedObject.parentId) {
			return updateAffectedGroupBoundsFromRoot(nextState, selectedId);
		}

		return nextState;
	}

	/**
	 * アンカータイプに応じたリサイズ計算を行う。
	 */
	private calculateResize(
		anchorType: TransformAnchorType,
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
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
		scaleX: number;
		scaleY: number;
	} | null {
		switch (anchorType) {
			case "bottomRight":
				return this.calculateBottomRightResize(
					startFrame,
					cursorX,
					cursorY,
					startFrameKeyPoints,
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
					startFrameKeyPoints,
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
					startFrameKeyPoints,
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
					startFrameKeyPoints,
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
					startFrameKeyPoints,
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
					startFrameKeyPoints,
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
					startFrameKeyPoints,
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
					startFrameKeyPoints,
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
		startFrameKeyPoints: FrameKeyPoints,
		radians: number,
		aspectRatio: number,
		doKeepProportion: boolean,
		scaleX: number,
		scaleY: number,
	) {
		// Apply drag constraints to cursor position
		const constrained = doKeepProportion
			? createLinearY2xFunction(
					startFrameKeyPoints.bottomRight,
					startFrameKeyPoints.topLeft,
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
			startFrameKeyPoints.topLeft.x,
			startFrameKeyPoints.topLeft.y,
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

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = calcNonZeroSign(newHeight);

		return {
			width: newWidth,
			height: newHeight,
			inversedCenterX,
			inversedCenterY,
			scaleX: newScaleX,
			scaleY: newScaleY,
		};
	}

	/**
	 * 左上アンカーのリサイズ計算。
	 */
	private calculateTopLeftResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
		radians: number,
		aspectRatio: number,
		doKeepProportion: boolean,
		scaleX: number,
		scaleY: number,
	) {
		// Apply drag constraints to cursor position
		const constrained = doKeepProportion
			? createLinearY2xFunction(
					startFrameKeyPoints.topLeft,
					startFrameKeyPoints.bottomRight,
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
			startFrameKeyPoints.bottomRight.x,
			startFrameKeyPoints.bottomRight.y,
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

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = calcNonZeroSign(newHeight);

		return {
			width: newWidth,
			height: newHeight,
			inversedCenterX,
			inversedCenterY,
			scaleX: newScaleX,
			scaleY: newScaleY,
		};
	}

	/**
	 * 右上アンカーのリサイズ計算。
	 */
	private calculateTopRightResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
		radians: number,
		aspectRatio: number,
		doKeepProportion: boolean,
		scaleX: number,
		scaleY: number,
	) {
		// Apply drag constraints to cursor position
		const constrained = doKeepProportion
			? createLinearY2xFunction(
					startFrameKeyPoints.topRight,
					startFrameKeyPoints.bottomLeft,
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
			startFrameKeyPoints.bottomLeft.x,
			startFrameKeyPoints.bottomLeft.y,
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

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = calcNonZeroSign(newHeight);

		return {
			width: newWidth,
			height: newHeight,
			inversedCenterX,
			inversedCenterY,
			scaleX: newScaleX,
			scaleY: newScaleY,
		};
	}

	/**
	 * 左下アンカーのリサイズ計算。
	 */
	private calculateBottomLeftResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
		radians: number,
		aspectRatio: number,
		doKeepProportion: boolean,
		scaleX: number,
		scaleY: number,
	) {
		// Apply drag constraints to cursor position
		const constrained = doKeepProportion
			? createLinearY2xFunction(
					startFrameKeyPoints.bottomLeft,
					startFrameKeyPoints.topRight,
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
			startFrameKeyPoints.topRight.x,
			startFrameKeyPoints.topRight.y,
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

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = calcNonZeroSign(newHeight);

		return {
			width: newWidth,
			height: newHeight,
			inversedCenterX,
			inversedCenterY,
			scaleX: newScaleX,
			scaleY: newScaleY,
		};
	}

	/**
	 * 上中央アンカーのリサイズ計算。
	 */
	private calculateTopCenterResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
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
					startFrameKeyPoints.bottomCenter,
					startFrameKeyPoints.topCenter,
				)(cursorX, cursorY)
			: createLinearX2yFunction(
					startFrameKeyPoints.bottomCenter,
					startFrameKeyPoints.topCenter,
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
			startFrameKeyPoints.bottomCenter.x,
			startFrameKeyPoints.bottomCenter.y,
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

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(finalWidth);
		const newScaleY = calcNonZeroSign(finalHeight);

		return {
			width: finalWidth,
			height: finalHeight,
			inversedCenterX,
			inversedCenterY,
			scaleX: newScaleX,
			scaleY: newScaleY,
		};
	}

	/**
	 * 右中央アンカーのリサイズ計算。
	 */
	private calculateRightCenterResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
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
					startFrameKeyPoints.leftCenter,
					startFrameKeyPoints.rightCenter,
				)(cursorX, cursorY)
			: createLinearY2xFunction(
					startFrameKeyPoints.leftCenter,
					startFrameKeyPoints.rightCenter,
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
			startFrameKeyPoints.leftCenter.x,
			startFrameKeyPoints.leftCenter.y,
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

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = calcNonZeroSign(newHeight);

		return {
			width: newWidth,
			height: newHeight,
			inversedCenterX,
			inversedCenterY,
			scaleX: newScaleX,
			scaleY: newScaleY,
		};
	}

	/**
	 * 下中央アンカーのリサイズ計算。
	 */
	private calculateBottomCenterResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
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
					startFrameKeyPoints.bottomCenter,
					startFrameKeyPoints.topCenter,
				)(cursorX, cursorY)
			: createLinearX2yFunction(
					startFrameKeyPoints.bottomCenter,
					startFrameKeyPoints.topCenter,
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
			startFrameKeyPoints.topCenter.x,
			startFrameKeyPoints.topCenter.y,
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

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(finalWidth);
		const newScaleY = calcNonZeroSign(finalHeight);

		return {
			width: finalWidth,
			height: finalHeight,
			inversedCenterX,
			inversedCenterY,
			scaleX: newScaleX,
			scaleY: newScaleY,
		};
	}

	/**
	 * 左中央アンカーのリサイズ計算。
	 */
	private calculateLeftCenterResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
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
					startFrameKeyPoints.leftCenter,
					startFrameKeyPoints.rightCenter,
				)(cursorX, cursorY)
			: createLinearY2xFunction(
					startFrameKeyPoints.leftCenter,
					startFrameKeyPoints.rightCenter,
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
			startFrameKeyPoints.rightCenter.x,
			startFrameKeyPoints.rightCenter.y,
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

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = calcNonZeroSign(newHeight);

		return {
			width: newWidth,
			height: newHeight,
			inversedCenterX,
			inversedCenterY,
			scaleX: newScaleX,
			scaleY: newScaleY,
		};
	}

	/**
	 * Transform control アンカーでのドラッグ終了を処理する。
	 */
	private handleDragEnd(
		state: CanvasState,
		event: CanvasEvent,
		anchorType: TransformAnchorType,
	): CanvasState {
		// Disable edge scrolling on drag end
		const nextState = {
			...state,
			edgeScrollEnabled: false,
		};
		// ドラッグハンドラーをもう一度呼び出して確定
		return this.handleDrag(nextState, event, anchorType);
	}

	/**
	 * 複数選択時のドラッグを処理（仮想グループの変形）。
	 */
	private handleMultiSelectDrag(
		state: CanvasState,
		event: CanvasEvent,
		anchorType: TransformAnchorType,
	): CanvasState {
		const eventStartState = state.eventStartState;
		if (!eventStartState) {
			return state;
		}

		// 変形開始時の仮想バウンディングボックスを計算
		const startVirtualBounds = calculateMultiSelectBounds(
			eventStartState.objects,
			state.selectedIds,
		);

		if (!startVirtualBounds) {
			return state;
		}

		// 仮想バウンディングボックスを単一オブジェクトとして変形計算
		// rotation は常に 0、scaleX/scaleY は 1 なので、TransformState として扱う
		const startFrame = {
			...startVirtualBounds,
			lockAspectRatio: false, // 複数選択時はアスペクト比固定なし（Shift キーで対応）
		} as TransformedFrame & TransformState;

		const radians = degreesToRadians(startFrame.rotation);

		const startFrameKeyPoints = calcFrameKeyPoints(startFrame);

		const { scaleX, scaleY } = startFrame;
		const aspectRatio = startFrame.width / startFrame.height;
		const lockAspectRatio = startFrame.lockAspectRatio ?? false;
		const doKeepProportion = lockAspectRatio || event.mods.shift;
		const isSwapped = (startFrame.rotation + 405) % 180 > 90;

		// 既存のリサイズ計算ロジックを使用
		const resizeResult = this.calculateResize(
			anchorType,
			startFrame,
			event.last.x,
			event.last.y,
			startFrameKeyPoints,
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
			scaleX: newScaleX,
			scaleY: newScaleY,
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

		// 変形後の仮想バウンディングボックス
		const endVirtualBounds: TransformedFrame = {
			cx: roundToDecimal(newCenter.x, PRECISION.COORDINATE),
			cy: roundToDecimal(newCenter.y, PRECISION.COORDINATE),
			width: roundToDecimal(Math.abs(newWidth), PRECISION.SIZE),
			height: roundToDecimal(Math.abs(newHeight), PRECISION.SIZE),
			rotation: startFrame.rotation, // 回転は変更しない（常に0）
			scaleX: newScaleX,
			scaleY: newScaleY,
		};

		// 変形を各選択オブジェクトに分配
		const updatedObjects = distributeTransformToSelection(
			state.selectedIds,
			eventStartState.objects,
			startVirtualBounds,
			endVirtualBounds,
		);

		const nextState = {
			...state,
			objects: updatedObjects,
		};

		// 親グループのバウンディングボックスを更新
		return updateAffectedGroupBounds(nextState, state.selectedIds);
	}

	/**
	 * rotation アンカーのドラッグを処理（回転ハンドル）。
	 */
	private handleRotationDrag(
		state: CanvasState,
		event: CanvasEvent,
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
		const cursorX = event.last.x;
		const cursorY = event.last.y;

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

		// 新しい回転角度を計算（0-360度、小数点第3位で丸める）
		const newRotation = roundToDecimal(
			(radiansToDegrees(radian - rotatePointRadian) + 360) % 360,
			PRECISION.ROTATION,
		);

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

		// グループの場合、子オブジェクトも回転させる
		if (updatedObject.type === "group") {
			const rotatedChildren = rotateGroupChildren(
				startObject as GroupState,
				updatedObject as GroupState,
				newRotation,
				updatedObjects,
			);
			Object.assign(updatedObjects, rotatedChildren);
		}

		const nextState = {
			...state,
			objects: updatedObjects,
		};

		// 親グループのバウンディングボックスを更新
		return updateAffectedGroupBounds(nextState, [selectedId]);
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
