import type { FrameKeyPoints, TransformedFrame } from "@workspace/geometry";
import {
	calcAffineTransformedPoint,
	calcFrameKeyPoints,
	calcInverseAffineTransformedPoint,
	calcNonZeroSign,
	calcProjectionOntoLine,
	calcVectorAngle,
	degreesToRadians,
	isTransformedFrame,
	nanToZero,
	normalizeAngle,
	radiansToDegrees,
	roundToDecimal,
} from "@workspace/geometry";

import type { TransformAnchorType } from "./TransformAnchorType";
import { calcMultiSelectGroupBounds } from "./utils/calcMultiSelectGroupBounds";
import {
	calcSnapCursorDelta,
	calcTentativeBBox,
	getAnchorXSnapEdge,
	getAnchorYSnapEdge,
} from "./utils/calcSnapCursorDelta";
import {
	calcHeightWithAspectRatio,
	calcWidthWithAspectRatio,
	enforceResizeDimensions,
} from "./utils/enforceResizeDimensions";
import { updateSingleGroupBounds } from "./utils/updateSingleGroupBounds";
import { PRECISION } from "../../../../../constants/precision";
import type { TransformState } from "../../../../../states/objects/base/TransformState";
import { isTransformState } from "../../../../../states/objects/base/TransformState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import type {
	CanvasControllerState,
	SnapFeedback,
} from "../../../../CanvasTypes";
import { updateGroupBoundsFromRoot } from "../../../../utils/updateGroupBoundsFromRoot";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../../../utils/snap/findSnap";
import {
	transformChildren,
	rotateChildren,
} from "../../objects/primitives/GroupController";
import type { ControlStrategy } from "../ControlEventHandler";

/**
 * Handles transform-control operations (resize and rotation).
 *
 * Control ID format: "transform-control:<anchorType>"
 * Example: "transform-control:bottomRight"
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

		// Check whether it is a transform-control
		return targetId.startsWith("transform-control:");
	}

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		// Only handle left-click (button 0)
		if (event.button !== 0) {
			return state;
		}

		const targetControlId = event.targetId;
		if (!targetControlId) {
			return state;
		}

		// Parse the anchor type from "transform-control:bottomRight"
		const parts = targetControlId.split(":");
		if (parts.length !== 2 || parts[0] !== "transform-control") {
			return state;
		}

		const anchorType = parts[1] as TransformAnchorType;

		// Route to the appropriate handler based on the gesture type
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
	 * Handles drag start on a transform-control anchor.
	 */
	private handleDragStart(
		state: CanvasControllerState,
		_event: CanvasEvent,
		_anchorType: TransformAnchorType,
	): CanvasControllerState {
		return {
			...state,
			edgeScrollEnabled: true,
			objectMenuOpenId: null,
		};
	}

	/**
	 * Handles dragging on a transform-control anchor.
	 */
	private handleDrag(
		state: CanvasControllerState,
		event: CanvasEvent,
		anchorType: TransformAnchorType,
	): CanvasControllerState {
		// Rotation is handled separately
		if (anchorType === "rotation") {
			return this.handleRotationDrag(state, event);
		}

		// Common preprocessing for resize handling
		const eventStartSnapshot = state.eventStartSnapshot;
		if (!eventStartSnapshot) {
			return state;
		}

		// Determine the target frame (multiSelectGroup for multi-selection, the selected object for single selection)
		let startFrame: (TransformedFrame & TransformState) | null = null;
		let selectedId: string | null = null;
		const isMultiSelect = state.selectedIds.length > 1;

		if (isMultiSelect) {
			// For multi-selection, use multiSelectGroup
			const multiSelectGroup = eventStartSnapshot.multiSelectGroup;
			if (
				multiSelectGroup &&
				isTransformedFrame(multiSelectGroup) &&
				isTransformState(multiSelectGroup)
			) {
				startFrame = multiSelectGroup as TransformedFrame & TransformState;
			}
		} else if (state.selectedIds.length === 1) {
			// For single selection
			selectedId = state.selectedIds[0];
			const startObject = eventStartSnapshot.objects[selectedId];
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

		// Compute the inverse affine-transformed cursor position (in the object's local space)
		const radians = degreesToRadians(startFrame.rotation);

		// Cursor position in world space

		// Get from keyPoints, or compute if absent
		const startFrameKeyPointsId = isMultiSelect
			? eventStartSnapshot.multiSelectGroup?.id
			: selectedId;
		const startFrameKeyPoints: FrameKeyPoints =
			(startFrameKeyPointsId &&
				eventStartSnapshot.keyPoints[startFrameKeyPointsId]) ||
			calcFrameKeyPoints(startFrame);

		const aspectRatio =
			startFrame.height !== 0 && startFrame.width !== 0
				? startFrame.width / startFrame.height
				: undefined;
		const lockAspectRatio = startFrame.lockAspectRatio ?? false;
		const doKeepProportion =
			(lockAspectRatio || event.mods.shift) && aspectRatio !== undefined;

		// Route to anchor-specific resize handling
		let resizeResult = this.calculateResize(
			anchorType,
			startFrame,
			event.last.x,
			event.last.y,
			startFrameKeyPoints,
			radians,
			aspectRatio,
			doKeepProportion,
		);

		if (!resizeResult) {
			return state;
		}

		// ── Snap correction ─────────────────────────────────────────────────
		let snapFeedback: SnapFeedback = { x: [], y: [] };

		if (!event.mods.ctrl) {
			const tentativeBBox = calcTentativeBBox(
				resizeResult,
				startFrame,
				radians,
			);
			const xEdge = getAnchorXSnapEdge(anchorType, resizeResult.scaleX);
			const yEdge = getAnchorYSnapEdge(anchorType, resizeResult.scaleY);

			if (xEdge !== null || yEdge !== null) {
				// Numerical Jacobian: compute the BBox change when the cursor moves by ε
				const ε = 1.0;
				const resPlusDx = this.calculateResize(
					anchorType,
					startFrame,
					event.last.x + ε,
					event.last.y,
					startFrameKeyPoints,
					radians,
					aspectRatio,
					doKeepProportion,
				);
				const resPlusDy = this.calculateResize(
					anchorType,
					startFrame,
					event.last.x,
					event.last.y + ε,
					startFrameKeyPoints,
					radians,
					aspectRatio,
					doKeepProportion,
				);
				const bboxPlusDx = resPlusDx
					? calcTentativeBBox(resPlusDx, startFrame, radians)
					: tentativeBBox;
				const bboxPlusDy = resPlusDy
					? calcTentativeBBox(resPlusDy, startFrame, radians)
					: tentativeBBox;

				const J = {
					left: {
						dx: (bboxPlusDx.left - tentativeBBox.left) / ε,
						dy: (bboxPlusDy.left - tentativeBBox.left) / ε,
					},
					right: {
						dx: (bboxPlusDx.right - tentativeBBox.right) / ε,
						dy: (bboxPlusDy.right - tentativeBBox.right) / ε,
					},
					top: {
						dx: (bboxPlusDx.top - tentativeBBox.top) / ε,
						dy: (bboxPlusDy.top - tentativeBBox.top) / ε,
					},
					bottom: {
						dx: (bboxPlusDx.bottom - tentativeBBox.bottom) / ε,
						dy: (bboxPlusDy.bottom - tentativeBBox.bottom) / ε,
					},
				} as const;

				// Skip snapping for low-sensitivity edges
				const SENSITIVITY = 0.3;
				const xSens = xEdge
					? Math.max(Math.abs(J[xEdge].dx), Math.abs(J[xEdge].dy))
					: 0;
				const ySens = yEdge
					? Math.max(Math.abs(J[yEdge].dx), Math.abs(J[yEdge].dy))
					: 0;
				const snapX = xEdge !== null && xSens > SENSITIVITY;
				const snapY = yEdge !== null && ySens > SENSITIVITY;

				if (snapX || snapY) {
					// Snap candidates use the cached set of all objects from dragStart by reference only;
					// exclusions (selection + all descendants) are passed to findSnap as a Set and filtered internally.
					const snapCandidates = eventStartSnapshot.snapCandidates;
					const excludeIds = eventStartSnapshot.selectedIdsWithDescendants;

					const zoom = state.viewport.zoom;
					const findSnapResult = findSnap(
						snapCandidates,
						SNAP_THRESHOLD_PX / zoom,
						snapX && xEdge ? [tentativeBBox[xEdge]] : [],
						snapY && yEdge ? [tentativeBBox[yEdge]] : [],
						excludeIds,
					);

					const cursorDelta = calcSnapCursorDelta(
						J,
						snapX ? xEdge : null,
						snapY ? yEdge : null,
						findSnapResult.delta.x,
						findSnapResult.delta.y,
					);

					if (cursorDelta.dx !== 0 || cursorDelta.dy !== 0) {
						const snapped = this.calculateResize(
							anchorType,
							startFrame,
							event.last.x + cursorDelta.dx,
							event.last.y + cursorDelta.dy,
							startFrameKeyPoints,
							radians,
							aspectRatio,
							doKeepProportion,
						);
						if (snapped) {
							resizeResult = snapped;
						}
					}

					// Generate guide lines from the actual BBox after snapping
					const actualBBox = calcTentativeBBox(
						resizeResult,
						startFrame,
						radians,
					);
					snapFeedback = buildSnapFeedback(
						actualBBox,
						findSnapResult.xResult,
						findSnapResult.yResult,
						snapCandidates,
						excludeIds,
					);
				}
			}
		}
		// ────────────────────────────────────────────────────────────────────

		const {
			width: newWidth,
			height: newHeight,
			inversedCenterX,
			inversedCenterY,
			scaleX: newScaleX,
			scaleY: newScaleY,
		} = resizeResult;

		// Transform the new center into world space
		const newCenter = calcAffineTransformedPoint(
			inversedCenterX,
			inversedCenterY,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);

		// Update the object/group with the new dimensions and center
		const updatedFrame = {
			...startFrame,
			width: roundToDecimal(Math.abs(newWidth), PRECISION.SIZE),
			height: roundToDecimal(Math.abs(newHeight), PRECISION.SIZE),
			cx: roundToDecimal(newCenter.x, PRECISION.COORDINATE),
			cy: roundToDecimal(newCenter.y, PRECISION.COORDINATE),
			scaleX: newScaleX,
			scaleY: newScaleY,
		};

		// Build the updated object map from eventStartSnapshot
		const updatedObjects = {
			...eventStartSnapshot.objects,
		};

		let nextState: CanvasControllerState;

		if (isMultiSelect) {
			// Multi-selection: transform each selected object relative to multiSelectGroup
			const startGroup = startFrame as GroupState;
			const updatedGroup: GroupState = {
				...startGroup,
				...updatedFrame,
			};

			const groupChildrenUpdates = transformChildren(
				startGroup,
				updatedGroup,
				startGroup,
				eventStartSnapshot.objects,
			);
			Object.assign(updatedObjects, groupChildrenUpdates);

			// Update multiSelectGroup as well
			nextState = {
				...state,
				objects: updatedObjects,
				multiSelectGroup: updatedGroup,
				snapFeedback,
			};

			// Recompute the bounding box of multiSelectGroup (only this is updated during drag)
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
			// Single selection: update the selected object itself
			if (!selectedId) {
				return state;
			}

			const startObject = eventStartSnapshot.objects[selectedId];
			if (!startObject) {
				return state;
			}

			const updatedObject = {
				...startObject,
				...updatedFrame,
			};
			updatedObjects[selectedId] = updatedObject;

			// If it is a group, also transform the child objects
			if (updatedObject.type === "group") {
				const groupChildrenUpdates = transformChildren(
					startObject as GroupState,
					updatedObject as GroupState,
					updatedObject as GroupState,
					eventStartSnapshot.objects,
				);
				Object.assign(updatedObjects, groupChildrenUpdates);
			}

			nextState = {
				...state,
				objects: updatedObjects,
				snapFeedback,
			};

			// Only for a single group selection, update that group's own bounds (during drag).
			// Parent group updates happen on dragEnd.
			if (updatedObject.type === "group") {
				return updateSingleGroupBounds(nextState, selectedId);
			}
		}

		return nextState;
	}

	/**
	 * Performs the resize calculation according to the anchor type.
	 */
	private calculateResize(
		anchorType: TransformAnchorType,
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
		radians: number,
		aspectRatio: number | undefined,
		doKeepProportion: boolean,
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
				);
			default:
				return null;
		}
	}

	/**
	 * Resize calculation for the bottom-right anchor.
	 */
	private calculateBottomRightResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
		radians: number,
		aspectRatio: number | undefined,
		doKeepProportion: boolean,
	) {
		// Apply drag constraints to cursor position
		const constrained = doKeepProportion
			? calcProjectionOntoLine(
					startFrameKeyPoints.topLeft,
					startFrameKeyPoints.bottomRight,
					{ x: cursorX, y: cursorY },
				)
			: { x: cursorX, y: cursorY };

		// Transform the cursor into the object's local space (rotation only, no scale)
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
		if (doKeepProportion && aspectRatio !== undefined) {
			newHeight = calcHeightWithAspectRatio(newWidth, aspectRatio);
		} else {
			newHeight = inversedCursor.y - inversedTopLeft.y;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = calcNonZeroSign(newHeight);

		const enforced = enforceResizeDimensions(
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
	 * Resize calculation for the top-left anchor.
	 */
	private calculateTopLeftResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
		radians: number,
		aspectRatio: number | undefined,
		doKeepProportion: boolean,
	) {
		// Apply drag constraints to cursor position
		const constrained = doKeepProportion
			? calcProjectionOntoLine(
					startFrameKeyPoints.bottomRight,
					startFrameKeyPoints.topLeft,
					{ x: cursorX, y: cursorY },
				)
			: { x: cursorX, y: cursorY };

		// Transform the cursor into the object's local space (rotation only, no scale)
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
		if (doKeepProportion && aspectRatio !== undefined) {
			newHeight = calcHeightWithAspectRatio(newWidth, aspectRatio);
		} else {
			newHeight = inversedBottomRight.y - inversedCursor.y;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = calcNonZeroSign(newHeight);

		const enforced = enforceResizeDimensions(
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
	 * Resize calculation for the top-right anchor.
	 */
	private calculateTopRightResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
		radians: number,
		aspectRatio: number | undefined,
		doKeepProportion: boolean,
	) {
		// Apply drag constraints to cursor position
		const constrained = doKeepProportion
			? calcProjectionOntoLine(
					startFrameKeyPoints.bottomLeft,
					startFrameKeyPoints.topRight,
					{ x: cursorX, y: cursorY },
				)
			: { x: cursorX, y: cursorY };

		// Transform the cursor into the object's local space (rotation only, no scale)
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
		if (doKeepProportion && aspectRatio !== undefined) {
			newHeight = calcHeightWithAspectRatio(newWidth, aspectRatio);
		} else {
			newHeight = inversedBottomLeft.y - inversedCursor.y;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = calcNonZeroSign(newHeight);

		const enforced = enforceResizeDimensions(
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
	 * Resize calculation for the bottom-left anchor.
	 */
	private calculateBottomLeftResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
		radians: number,
		aspectRatio: number | undefined,
		doKeepProportion: boolean,
	) {
		// Apply drag constraints to cursor position
		const constrained = doKeepProportion
			? calcProjectionOntoLine(
					startFrameKeyPoints.topRight,
					startFrameKeyPoints.bottomLeft,
					{ x: cursorX, y: cursorY },
				)
			: { x: cursorX, y: cursorY };

		// Transform the cursor into the object's local space (rotation only, no scale)
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
		if (doKeepProportion && aspectRatio !== undefined) {
			newHeight = calcHeightWithAspectRatio(newWidth, aspectRatio);
		} else {
			newHeight = inversedCursor.y - inversedTopRight.y;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = calcNonZeroSign(newHeight);

		const enforced = enforceResizeDimensions(
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
	 * Resize calculation for the top-center anchor.
	 */
	private calculateTopCenterResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
		radians: number,
		aspectRatio: number | undefined,
		doKeepProportion: boolean,
	) {
		// Apply drag constraints to cursor position
		const constrained = calcProjectionOntoLine(
			startFrameKeyPoints.bottomCenter,
			startFrameKeyPoints.topCenter,
			{ x: cursorX, y: cursorY },
		);

		// Transform the cursor into the object's local space (rotation only, no scale)
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
		if (doKeepProportion && aspectRatio !== undefined) {
			newWidth = calcWidthWithAspectRatio(newHeight, aspectRatio);
		} else {
			newWidth = startFrame.width;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = startFrame.scaleX;
		const newScaleY = calcNonZeroSign(newHeight);

		const enforced = enforceResizeDimensions(
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
	 * Resize calculation for the right-center anchor.
	 */
	private calculateRightCenterResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
		radians: number,
		aspectRatio: number | undefined,
		doKeepProportion: boolean,
	) {
		// Apply drag constraints to cursor position
		const constrained = calcProjectionOntoLine(
			startFrameKeyPoints.leftCenter,
			startFrameKeyPoints.rightCenter,
			{ x: cursorX, y: cursorY },
		);

		// Transform the cursor into the object's local space (rotation only, no scale)
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
		if (doKeepProportion && aspectRatio !== undefined) {
			newHeight = calcHeightWithAspectRatio(newWidth, aspectRatio);
		} else {
			newHeight = startFrame.height;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = startFrame.scaleY;

		const enforced = enforceResizeDimensions(
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
	 * Resize calculation for the bottom-center anchor.
	 */
	private calculateBottomCenterResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
		radians: number,
		aspectRatio: number | undefined,
		doKeepProportion: boolean,
	) {
		// Apply drag constraints to cursor position
		const constrained = calcProjectionOntoLine(
			startFrameKeyPoints.topCenter,
			startFrameKeyPoints.bottomCenter,
			{ x: cursorX, y: cursorY },
		);

		// Transform the cursor into the object's local space (rotation only, no scale)
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
		if (doKeepProportion && aspectRatio !== undefined) {
			newWidth = calcWidthWithAspectRatio(newHeight, aspectRatio);
		} else {
			newWidth = startFrame.width;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = startFrame.scaleX;
		const newScaleY = calcNonZeroSign(newHeight);

		const enforced = enforceResizeDimensions(
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
	 * Resize calculation for the left-center anchor.
	 */
	private calculateLeftCenterResize(
		startFrame: TransformedFrame & TransformState,
		cursorX: number,
		cursorY: number,
		startFrameKeyPoints: FrameKeyPoints,
		radians: number,
		aspectRatio: number | undefined,
		doKeepProportion: boolean,
	) {
		// Apply drag constraints to cursor position
		const constrained = calcProjectionOntoLine(
			startFrameKeyPoints.rightCenter,
			startFrameKeyPoints.leftCenter,
			{ x: cursorX, y: cursorY },
		);

		// Transform the cursor into the object's local space (rotation only, no scale)
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
		if (doKeepProportion && aspectRatio !== undefined) {
			newHeight = calcHeightWithAspectRatio(newWidth, aspectRatio);
		} else {
			newHeight = startFrame.height;
		}

		// Calculate scaleX and scaleY from the sign of newWidth and newHeight
		const newScaleX = calcNonZeroSign(newWidth);
		const newScaleY = startFrame.scaleY;

		const enforced = enforceResizeDimensions(
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
	 * Handles drag end on a transform-control anchor.
	 */
	private handleDragEnd(
		state: CanvasControllerState,
		event: CanvasEvent,
		anchorType: TransformAnchorType,
	): CanvasControllerState {
		// Apply the drag-time state update to compute the final state
		let nextState = this.handleDrag({ ...state }, event, anchorType);

		// On dragEnd, update the bounds of the selected objects and their parent groups
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
	 * Handles dragging on the rotation anchor (rotation handle).
	 */
	private handleRotationDrag(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		const eventStartSnapshot = state.eventStartSnapshot;
		if (!eventStartSnapshot) {
			return state;
		}

		// Determine the target frame (multiSelectGroup for multi-selection, the selected object for single selection)
		let startFrame: TransformedFrame | null = null;
		let selectedId: string | null = null;
		const isMultiSelect = state.selectedIds.length > 1;

		if (isMultiSelect) {
			// For multi-selection, use multiSelectGroup
			const multiSelectGroup = eventStartSnapshot.multiSelectGroup;
			if (multiSelectGroup && isTransformedFrame(multiSelectGroup)) {
				startFrame = multiSelectGroup;
			}
		} else if (state.selectedIds.length === 1) {
			// For single selection
			selectedId = state.selectedIds[0];
			const startObject = eventStartSnapshot.objects[selectedId];
			if (startObject && isTransformedFrame(startObject)) {
				startFrame = startObject;
			}
		}

		if (!startFrame) {
			return state;
		}

		// Cursor position in world space
		const cursorX = event.last.x;
		const cursorY = event.last.y;

		// Compute the angle of the vector from the center point to the cursor
		const radian = calcVectorAngle(
			startFrame.cx,
			startFrame.cy,
			cursorX,
			cursorY,
		);

		// Compute the reference angle of the rotation point (toward the top-right)
		const rotatePointRadian = calcVectorAngle(
			startFrame.cx,
			startFrame.cy,
			startFrame.cx + startFrame.width,
			startFrame.cy - startFrame.height,
		);

		// Compute the new rotation angle (0-360 degrees, rounded to an integer)
		const newRotation = normalizeAngle(
			roundToDecimal(radiansToDegrees(radian - rotatePointRadian), 0),
		);

		// Build the updated object map from eventStartSnapshot
		const updatedObjects = {
			...eventStartSnapshot.objects,
		};

		let nextState: CanvasControllerState;

		if (isMultiSelect) {
			// Multi-selection: rotate each selected object relative to multiSelectGroup
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

			// Update multiSelectGroup as well
			nextState = {
				...state,
				objects: updatedObjects,
				multiSelectGroup: updatedGroup,
			};

			// Parent group updates are not done during drag (done on dragEnd)
		} else {
			// Single selection: rotate the selected object itself
			if (!selectedId) {
				return state;
			}

			const startObject = eventStartSnapshot.objects[selectedId];
			if (!startObject) {
				return state;
			}

			const updatedObject = {
				...startObject,
				rotation: newRotation,
			};
			updatedObjects[selectedId] = updatedObject;

			// If it is a group, also rotate the child objects
			if (updatedObject.type === "group") {
				const rotatedChildren = rotateChildren(
					startObject as GroupState,
					newRotation,
					updatedObject as GroupState,
					eventStartSnapshot.objects,
				);
				Object.assign(updatedObjects, rotatedChildren);
			}

			nextState = {
				...state,
				objects: updatedObjects,
			};

			// Only for a single group selection, update that group's own bounds (during drag).
			// Parent group updates happen on dragEnd.
			if (updatedObject.type === "group") {
				return updateSingleGroupBounds(nextState, selectedId);
			}
		}

		return nextState;
	}
}
