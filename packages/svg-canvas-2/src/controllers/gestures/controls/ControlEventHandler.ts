import {
	calcInverseAffineTransformedPoint,
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
	const startObject = state.eventStartState?.objects[selectedId];

	if (!startObject || !isTransformedFrame(startObject)) {
		return state;
	}

	// Calculate the inverse transformed cursor position (in object's local space)
	const { cx, cy, width, height, rotation, scaleX, scaleY } = startObject;
	const radians = (rotation * Math.PI) / 180;

	// Current cursor position in world space
	const cursorX = event.start.x + event.delta.x;
	const cursorY = event.start.y + event.delta.y;

	// Transform cursor to object's local space
	const inversedCursor = calcInverseAffineTransformedPoint(
		cursorX,
		cursorY,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	// For bottomRight anchor: topLeft is the fixed point
	// In local space (before scale), topLeft is at (-width/2, -height/2)
	// and bottomRight is at (width/2, height/2)
	const localTopLeftX = -width / 2;
	const localTopLeftY = -height / 2;

	// New dimensions from cursor position in local space
	const newWidth = inversedCursor.x - localTopLeftX;
	const newHeight = inversedCursor.y - localTopLeftY;

	// Get the current object state from eventStartState
	const eventStartObjects = state.eventStartState?.objects;
	if (!eventStartObjects) {
		return state;
	}

	// Update the object with new dimensions
	// Center position remains at (cx, cy) since we're just changing size
	const updatedObject = {
		...startObject,
		width: Math.abs(newWidth),
		height: Math.abs(newHeight),
		// Center doesn't move in this simplified version
		// In reality, we need to calculate the new center based on the fixed topLeft point
		cx: cx + nanToZero(newWidth / 2) - width / 2,
		cy: cy + nanToZero(newHeight / 2) - height / 2,
	};

	// Create updated objects map from eventStartState
	const updatedObjects = {
		...eventStartObjects,
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
