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

	if (event.type === "dragStart") {
		nextState = {
			...state,
			eventStartState: state,
		};
	}

	const objectStartState = nextState.eventStartState?.objects[targetObjectId];
	if (!objectStartState) {
		return nextState;
	}

	if (event.type === "dragStart" && eventHandler.onDragStart) {
		const newObjectState = eventHandler.onDragStart(
			event.delta!,
			objectStartState,
			nextState,
		);
		if (newObjectState !== objectStartState) {
			return {
				...nextState,
				objects: {
					...nextState.objects,
					[targetObjectId]: newObjectState,
				},
			};
		}
	} else if (event.type === "drag" && eventHandler.onDrag) {
		const newObjectState = eventHandler.onDrag(
			event.delta!,
			objectStartState,
			nextState,
		);
		if (newObjectState !== objectStartState) {
			return {
				...nextState,
				objects: {
					...nextState.objects,
					[targetObjectId]: newObjectState,
				},
			};
		}
	} else if (event.type === "dragEnd" && eventHandler.onDragEnd) {
		const newObjectState = eventHandler.onDragEnd(
			event.delta!,
			objectStartState,
			nextState,
		);
		if (newObjectState !== objectStartState) {
			return {
				...nextState,
				objects: {
					...nextState.objects,
					[targetObjectId]: newObjectState,
				},
			};
		}
	}

	if (event.type === "dragEnd") {
		nextState = {
			...nextState,
			eventStartState: null,
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
