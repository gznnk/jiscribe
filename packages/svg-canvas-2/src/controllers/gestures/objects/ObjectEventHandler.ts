import { objectRegistry } from "../../../registry/ObjectRegistry";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { CanvasEvent, EventType } from "../GestureHandler";

/**
 * Event types that should trigger saving the current state as eventStartState.
 * Add new event start types here as needed.
 */
const EVENT_START_TYPES: readonly EventType[] = ["dragStart"] as const;

/**
 * Event types that should trigger clearing the eventStartState.
 * Add new event end types here as needed.
 */
const EVENT_END_TYPES: readonly EventType[] = ["dragEnd"] as const;

/**
 * Handles events that occur on objects (not on canvas).
 * This is the main entry point for object-level event handling.
 */
export const handleObjectEvent = (
	state: CanvasState,
	event: CanvasEvent,
): CanvasState => {
	const targetObjectId = event.targetId;
	if (!targetObjectId) {
		return state;
	}
	const targetObject = state.objects[targetObjectId];
	if (!targetObject) {
		return state;
	}
	const eventHandler = objectRegistry.getEventHandler(targetObject.type);
	if (!eventHandler) {
		return state;
	}

	let nextState = state;

	if (EVENT_START_TYPES.includes(event.type)) {
		nextState = {
			...state,
			eventStartState: state,
		};
	}

	const objectStartState = nextState.eventStartState?.objects[targetObjectId];
	if (!objectStartState) {
		return nextState;
	}

	// Prepare common parameters for event handlers
	const handlerParams = {
		delta: event.delta,
		objectState: objectStartState,
		canvasState: nextState,
		mods: event.mods,
		time: event.time,
	};

	if (event.type === "dragStart" && eventHandler.onDragStart) {
		nextState = eventHandler.onDragStart(handlerParams);
	} else if (event.type === "drag" && eventHandler.onDrag) {
		nextState = eventHandler.onDrag(handlerParams);
	} else if (event.type === "dragEnd" && eventHandler.onDragEnd) {
		nextState = eventHandler.onDragEnd(handlerParams);
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
