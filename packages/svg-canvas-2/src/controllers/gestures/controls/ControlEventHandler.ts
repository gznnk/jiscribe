import {
	calcAffineTransformedPoint,
	calcFrameFeaturePoints,
	calcInverseAffineTransformedPoint,
	degreesToRadians,
	isTransformedFrame,
	nanToZero,
} from "@workspace/geometry";

import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { CanvasEvent, EventType } from "../GestureHandler";

/**
 * Event types that should trigger saving the current state as eventStartState.
 */
const EVENT_START_TYPES: readonly EventType[] = ["dragStart"] as const;

/**
 * Event types that should trigger clearing the eventStartState.
 */
const EVENT_END_TYPES: readonly EventType[] = ["dragEnd"] as const;

/**
 * Handles events that occur on transform control anchors.
 * This is the main entry point for control-level event handling.
 */
export const handleControlEvent = (
	state: CanvasState,
	event: CanvasEvent,
): CanvasState => {
	const targetControlId = event.targetId;
	if (!targetControlId) {
		return state;
	}

	// Parse control ID format: "transform-control:anchorType"
	const parts = targetControlId.split(":");
	if (parts.length !== 2 || parts[0] !== "transform-control") {
		return state;
	}

	const anchorType = parts[1];

	let nextState = state;

	if (EVENT_START_TYPES.includes(event.type)) {
		nextState = {
			...state,
			eventStartState: state,
		};
	}

	// Handle drag events on control anchors
	if (event.type === "dragStart") {
		nextState = handleControlDragStart(nextState, event, anchorType);
	} else if (event.type === "drag") {
		nextState = handleControlDrag(nextState, event, anchorType);
	} else if (event.type === "dragEnd") {
		nextState = handleControlDragEnd(nextState, event, anchorType);
	}

	if (EVENT_END_TYPES.includes(event.type)) {
		nextState = {
			...nextState,
			eventStartState: null,
			lastCommitTime: event.time,
		};
	}

	return nextState;
};

/**
 * Handle drag start on control anchor.
 */
const handleControlDragStart = (
	state: CanvasState,
	_event: CanvasEvent,
	_anchorType: string,
): CanvasState => {
	// Just save the state for now
	return state;
};

/**
 * Handle drag on control anchor.
 */
const handleControlDrag = (
	state: CanvasState,
	event: CanvasEvent,
	anchorType: string,
): CanvasState => {
	// Only handle bottomRight for now
	if (anchorType !== "bottomRight") {
		return state;
	}

	// Get the selected object (should be exactly one)
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

	// Calculate the inverse transformed cursor position (in object's local space)
	const radians = degreesToRadians(startObject.rotation);

	// Current cursor position in world space
	const cursorX = event.last.x;
	const cursorY = event.last.y;

	// Transform cursor to object's local space (rotation only, no scale)
	const inversedCursor = calcInverseAffineTransformedPoint(
		cursorX,
		cursorY,
		1,
		1,
		radians,
		startObject.cx,
		startObject.cy,
	);

	// Transform the fixed point (topLeft) to local space
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

	// New dimensions from cursor position in local space
	const newWidth = inversedCursor.x - inversedTopLeft.x;
	const newHeight = inversedCursor.y - inversedTopLeft.y;

	// Calculate new center in local space
	const inversedCenterX = inversedTopLeft.x + nanToZero(newWidth / 2);
	const inversedCenterY = inversedTopLeft.y + nanToZero(newHeight / 2);

	// Transform new center back to world space
	const newCenter = calcAffineTransformedPoint(
		inversedCenterX,
		inversedCenterY,
		1,
		1,
		radians,
		startObject.cx,
		startObject.cy,
	);

	// Update the object with new dimensions and center
	const updatedObject = {
		...startObject,
		width: Math.abs(newWidth),
		height: Math.abs(newHeight),
		cx: newCenter.x,
		cy: newCenter.y,
	};

	// Create updated objects map from eventStartState
	const updatedObjects = {
		...eventStartState.objects,
		[selectedId]: updatedObject,
	};

	return {
		...state,
		objects: updatedObjects,
	};
};

/**
 * Handle drag end on control anchor.
 */
const handleControlDragEnd = (
	state: CanvasState,
	event: CanvasEvent,
	anchorType: string,
): CanvasState => {
	// Call drag handler one more time to finalize
	return handleControlDrag(state, event, anchorType);
};
