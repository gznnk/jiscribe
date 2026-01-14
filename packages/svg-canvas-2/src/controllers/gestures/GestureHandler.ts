import type { Prettify } from "@workspace/utility-types/src/Prettify";

import { objectRegistry } from "../../registry/ObjectRegistry";
import type { CanvasState } from "../../states/canvas/CanvasState";
import type { Gesture, GestureType } from "../hooks/useGestureRecognizer";

type EventType = GestureType | "dragOver" | "dragLeave";

type CanvasEvent = Prettify<
	{
		type: EventType;
	} & Omit<Gesture, "type">
>;

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

const handleObjectEvent = (
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

export const handleGesture = (
	state: CanvasState,
	gesture: Gesture,
): CanvasState => {
	const events: CanvasEvent[] = [gesture];

	if (gesture.targetKind === "canvas") {
		// Handle canvas-level gestures here
		return state;
	}

	if (gesture.targetKind === "object") {
		let nextState = state;
		for (const event of events) {
			nextState = handleObjectEvent(nextState, event);
		}
		return nextState;
	}

	return state;
};
