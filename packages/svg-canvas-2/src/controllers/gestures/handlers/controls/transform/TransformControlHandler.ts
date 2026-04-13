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
	normalizeAngle,
	radiansToDegrees,
	roundToDecimal,
} from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type { CanvasEvent } from "../../../../../registry/GestureHandlerRegistryTypes";
import type { CanvasState } from "../../../../../states/canvas/CanvasState";
import { hasFrameKeyPoints } from "../../../../../states/objects/base/FrameWithKeyPoints";
import type { TransformState } from "../../../../../states/objects/base/TransformState";
import { isTransformState } from "../../../../../states/objects/base/TransformState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import {
	transformChildren,
	rotateChildren,
} from "../../objects/primitives/GroupController";
import type { ControlStrategy } from "../ControlEventHandler";
import { calcMultiSelectGroupBounds } from "./utils/calcMultiSelectGroupBounds";
import { updateGroupBoundsFromRoot } from "./utils/updateGroupBoundsFromRoot";
import { updateSingleGroupBounds } from "./utils/updateSingleGroupBounds";

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
		// 回転は別処理
		if (anchorType === "rotation") {
			return this.handleRotationDrag(state, event);
		}

		// リサイズ処理の共通前処理
		const eventStartState = state.eventStartState;
		if (!eventStartState) {
			return state;
		}

		// 対象のフレームを決定（複数選択時は multiSelectGroup、単一選択時は選択オブジェクト）
		let startFrame: (TransformedFrame & TransformState) | null = null;
		let selectedId: string | null = null;
		const isMultiSelect = state.selectedIds.length > 1;

		if (isMultiSelect) {
			// 複数選択の場合は multiSelectGroup を使用
			const multiSelectGroup = eventStartState.multiSelectGroup;
			if (
				multiSelectGroup &&
				isTransformedFrame(multiSelectGroup) &&
				isTransformState(multiSelectGroup)
			) {
				startFrame = multiSelectGroup as TransformedFrame & TransformState;
			}
		} else if (state.selectedIds.length === 1) {
			// 単一選択の場合
			selectedId = state.selectedIds[0];
			const startObject = eventStartState.objects[selectedId];
			if (
				startObject &&
				isTransformedFrame(startObject) &&
				isTransformState(startObject)
			) {
				startFrame = startObject as TransformedFrame & TransformState;
			}
		}

		if (!startFrame) {
			return state;
		}

		// 逆アフィン変換されたカーソル位置を計算（オブジェクトのローカル空間内）
		const radians = degreesToRadians(startFrame.rotation);

		// ワールド空間でのカーソル位置

		// キャッシュがあればそれを使用、なければ計算
		const startFrameKeyPoints: FrameKeyPoints = hasFrameKeyPoints(startFrame)
			? startFrame.keyPoints
			: calcFrameKeyPoints(startFrame);

		const isSwapped = (startFrame.rotation + 405) % 180 > 90;

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

		// 新しい寸法と中心でオブジェクト/グループを更新
		const updatedFrame = {
			...startFrame,
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
		};

		let nextState: CanvasState;

		if (isMultiSelect) {
			// 複数選択の場合: multiSelectGroup を基準に各選択オブジェクトを変換
			const startGroup = startFrame as GroupState;
			const updatedGroup: GroupState = {
				...startGroup,
				...updatedFrame,
			};

			const groupChildrenUpdates = transformChildren(
				startGroup,
				updatedGroup,
				startGroup,
				eventStartState.objects,
			);
			Object.assign(updatedObjects, groupChildrenUpdates);

			// multiSelectGroup も更新
			nextState = {
				...state,
				objects: updatedObjects,
				multiSelectGroup: updatedGroup,
			};

			// multiSelectGroup のバウンディングボックスを再計算（drag中はこれのみ更新）
			const recalculatedBounds = calcMultiSelectGroupBounds(
				state.selectedIds,
				nextState.objects,
				nextState.multiSelectGroup,
			);
			if (recalculatedBounds && nextState.multiSelectGroup) {
				nextState = {
					...nextState,
					multiSelectGroup: {
						...nextState.multiSelectGroup,
						...recalculatedBounds,
					},
				};
			}
		} else {
			// 単一選択の場合: 選択オブジェクト自身を更新
			if (!selectedId) {
				return state;
			}

			const startObject = eventStartState.objects[selectedId];
			if (!startObject) {
				return state;
			}

			const updatedObject = {
				...startObject,
				...updatedFrame,
			};
			updatedObjects[selectedId] = updatedObject;

			// グループの場合、子オブジェクトも変換する
			if (updatedObject.type === "group") {
				const groupChildrenUpdates = transformChildren(
					startObject as GroupState,
					updatedObject as GroupState,
					updatedObject as GroupState,
					eventStartState.objects,
				);
				Object.assign(updatedObjects, groupChildrenUpdates);
			}

			nextState = {
				...state,
				objects: updatedObjects,
			};

			// 単一グループ選択の場合のみ、そのグループ自身の境界を更新（drag中）
			// 親グループの更新はdragEndで行う
			if (updatedObject.type === "group") {
				return updateSingleGroupBounds(nextState, selectedId);
			}
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
		const newWidth = inversedCursor.x - inversedTopLeft.x;
		let newHeight: number;
		if (doKeepProportion) {
			newHeight = this.calcHeightWithAspectRatio(newWidth, aspectRatio);
		} else {
			newHeight = inversedCursor.y - inversedTopLeft.y;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = calcNonZeroSign(newHeight);

		const enforced = this.enforceMinimumDimensions(
			startFrame,
			newWidth,
			newHeight,
			aspectRatio,
			doKeepProportion,
		);

		const inversedCenterX = inversedTopLeft.x + nanToZero(enforced.width / 2);
		const inversedCenterY = inversedTopLeft.y + nanToZero(enforced.height / 2);

		return {
			width: enforced.width,
			height: enforced.height,
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
		const newWidth = inversedBottomRight.x - inversedCursor.x;
		let newHeight: number;
		if (doKeepProportion) {
			newHeight = this.calcHeightWithAspectRatio(newWidth, aspectRatio);
		} else {
			newHeight = inversedBottomRight.y - inversedCursor.y;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = calcNonZeroSign(newHeight);

		const enforced = this.enforceMinimumDimensions(
			startFrame,
			newWidth,
			newHeight,
			aspectRatio,
			doKeepProportion,
		);

		const inversedCenterX =
			inversedBottomRight.x - nanToZero(enforced.width / 2);
		const inversedCenterY =
			inversedBottomRight.y - nanToZero(enforced.height / 2);

		return {
			width: enforced.width,
			height: enforced.height,
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
		const newWidth = inversedCursor.x - inversedBottomLeft.x;
		let newHeight: number;
		if (doKeepProportion) {
			newHeight = this.calcHeightWithAspectRatio(newWidth, aspectRatio);
		} else {
			newHeight = inversedBottomLeft.y - inversedCursor.y;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = calcNonZeroSign(newHeight);

		const enforced = this.enforceMinimumDimensions(
			startFrame,
			newWidth,
			newHeight,
			aspectRatio,
			doKeepProportion,
		);

		const inversedCenterX =
			inversedBottomLeft.x + nanToZero(enforced.width / 2);
		const inversedCenterY =
			inversedBottomLeft.y - nanToZero(enforced.height / 2);

		return {
			width: enforced.width,
			height: enforced.height,
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
		const newWidth = inversedTopRight.x - inversedCursor.x;
		let newHeight: number;
		if (doKeepProportion) {
			newHeight = this.calcHeightWithAspectRatio(newWidth, aspectRatio);
		} else {
			newHeight = inversedCursor.y - inversedTopRight.y;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = calcNonZeroSign(newHeight);

		const enforced = this.enforceMinimumDimensions(
			startFrame,
			newWidth,
			newHeight,
			aspectRatio,
			doKeepProportion,
		);

		const inversedCenterX = inversedTopRight.x - nanToZero(enforced.width / 2);
		const inversedCenterY = inversedTopRight.y + nanToZero(enforced.height / 2);

		return {
			width: enforced.width,
			height: enforced.height,
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
			newWidth = this.calcWidthWithAspectRatio(newHeight, aspectRatio);
		} else {
			newWidth = startFrame.width;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = startFrame.scaleX;
		const newScaleY = calcNonZeroSign(newHeight);

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
		const newWidth = inversedCursor.x - inversedLeftCenter.x;
		let newHeight: number;
		if (doKeepProportion) {
			newHeight = this.calcHeightWithAspectRatio(newWidth, aspectRatio);
		} else {
			newHeight = startFrame.height;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = startFrame.scaleY;

		const enforced = this.enforceMinimumDimensions(
			startFrame,
			newWidth,
			newHeight,
			aspectRatio,
			doKeepProportion,
		);

		const inversedCenterX =
			inversedLeftCenter.x + nanToZero(enforced.width / 2);
		const inversedCenterY = inversedLeftCenter.y;

		return {
			width: enforced.width,
			height: enforced.height,
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
			newWidth = this.calcWidthWithAspectRatio(newHeight, aspectRatio);
		} else {
			newWidth = startFrame.width;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = startFrame.scaleX;
		const newScaleY = calcNonZeroSign(newHeight);

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
		const newWidth = inversedRightCenter.x - inversedCursor.x;
		let newHeight: number;
		if (doKeepProportion) {
			newHeight = this.calcHeightWithAspectRatio(newWidth, aspectRatio);
		} else {
			newHeight = startFrame.height;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = startFrame.scaleY;

		const enforced = this.enforceMinimumDimensions(
			startFrame,
			newWidth,
			newHeight,
			aspectRatio,
			doKeepProportion,
		);

		const inversedCenterX =
			inversedRightCenter.x - nanToZero(enforced.width / 2);
		const inversedCenterY = inversedRightCenter.y;

		return {
			width: enforced.width,
			height: enforced.height,
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
		// ドラッグ中の状態更新を適用して最終状態を計算
		let nextState = this.handleDrag({ ...state }, event, anchorType);

		// dragEnd時に選択中のオブジェクトとその親グループの境界を更新
		for (const selectedId of nextState.selectedIds) {
			const obj = nextState.objects[selectedId];
			if (obj && (obj.type === "group" || obj.parentId)) {
				nextState = updateGroupBoundsFromRoot(nextState, selectedId);
			}
		}

		return {
			...nextState,
			edgeScrollEnabled: false, // Disable edge scrolling on drag end
		};
	}

	/**
	 * rotation アンカーのドラッグを処理（回転ハンドル）。
	 */
	private handleRotationDrag(
		state: CanvasState,
		event: CanvasEvent,
	): CanvasState {
		const eventStartState = state.eventStartState;
		if (!eventStartState) {
			return state;
		}

		// 対象のフレームを決定（複数選択時は multiSelectGroup、単一選択時は選択オブジェクト）
		let startFrame: TransformedFrame | null = null;
		let selectedId: string | null = null;
		const isMultiSelect = state.selectedIds.length > 1;

		if (isMultiSelect) {
			// 複数選択の場合は multiSelectGroup を使用
			const multiSelectGroup = eventStartState.multiSelectGroup;
			if (multiSelectGroup && isTransformedFrame(multiSelectGroup)) {
				startFrame = multiSelectGroup;
			}
		} else if (state.selectedIds.length === 1) {
			// 単一選択の場合
			selectedId = state.selectedIds[0];
			const startObject = eventStartState.objects[selectedId];
			if (startObject && isTransformedFrame(startObject)) {
				startFrame = startObject;
			}
		}

		if (!startFrame) {
			return state;
		}

		// ワールド空間でのカーソル位置
		const cursorX = event.last.x;
		const cursorY = event.last.y;

		// 中心点からカーソルへのベクトル角度を計算
		const radian = calcVectorAngle(
			startFrame.cx,
			startFrame.cy,
			cursorX,
			cursorY,
		);

		// 回転ポイントの基準角度を計算（右上方向）
		const rotatePointRadian = calcVectorAngle(
			startFrame.cx,
			startFrame.cy,
			startFrame.cx + startFrame.width,
			startFrame.cy - startFrame.height,
		);

		// 新しい回転角度を計算（0-360度、整数に丸める）
		const newRotation = normalizeAngle(
			roundToDecimal(radiansToDegrees(radian - rotatePointRadian), 0),
		);

		// eventStartState から更新されたオブジェクトマップを作成
		const updatedObjects = {
			...eventStartState.objects,
		};

		let nextState: CanvasState;

		if (isMultiSelect) {
			// 複数選択の場合: multiSelectGroup を基準に各選択オブジェクトを回転
			const startGroup = startFrame as GroupState;
			const updatedGroup: GroupState = {
				...startGroup,
				rotation: newRotation,
			};

			const rotatedChildren = rotateChildren(
				startGroup,
				newRotation,
				updatedGroup,
				updatedObjects,
			);
			Object.assign(updatedObjects, rotatedChildren);

			// multiSelectGroup も更新
			nextState = {
				...state,
				objects: updatedObjects,
				multiSelectGroup: updatedGroup,
			};

			// drag中は親グループの更新はしない（dragEndで行う）
		} else {
			// 単一選択の場合: 選択オブジェクト自身を回転
			if (!selectedId) {
				return state;
			}

			const startObject = eventStartState.objects[selectedId];
			if (!startObject) {
				return state;
			}

			const updatedObject = {
				...startObject,
				rotation: newRotation,
			};
			updatedObjects[selectedId] = updatedObject;

			// グループの場合、子オブジェクトも回転させる
			if (updatedObject.type === "group") {
				const rotatedChildren = rotateChildren(
					startObject as GroupState,
					newRotation,
					updatedObject as GroupState,
					updatedObjects,
				);
				Object.assign(updatedObjects, rotatedChildren);
			}

			nextState = {
				...state,
				objects: updatedObjects,
			};

			// 単一グループ選択の場合のみ、そのグループ自身の境界を更新（drag中）
			// 親グループの更新はdragEndで行う
			if (updatedObject.type === "group") {
				return updateSingleGroupBounds(nextState, selectedId);
			}
		}

		return nextState;
	}

	/**
	 * Calculates the height that maintains the original aspect ratio.
	 */
	private calcHeightWithAspectRatio(width: number, aspectRatio: number) {
		return nanToZero(width / aspectRatio);
	}

	/**
	 * Calculates the width that maintains the original aspect ratio.
	 */
	private calcWidthWithAspectRatio(height: number, aspectRatio: number) {
		return nanToZero(height * aspectRatio);
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
