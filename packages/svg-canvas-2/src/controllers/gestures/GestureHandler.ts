import type { Prettify } from "@workspace/utility-types/src/Prettify";

import type { CanvasState } from "../../states/canvas/CanvasState";
import type { Gesture, GestureType } from "../hooks/useGestureRecognizer";
import { handleCanvasEvent } from "./canvas/CanvasEventHandler";
import { handleControlEvent } from "./controls/ControlEventHandler";
import { handleObjectEvent } from "./objects/ObjectEventHandler";

export type EventType = GestureType | "dragOver" | "dragLeave";

export type CanvasEvent = Prettify<
	{
		type: EventType;
	} & Omit<Gesture, "type">
>;

/**
 * Main gesture router.
 * Routes gestures to appropriate handlers based on target kind.
 */
export const handleGesture = (
	state: CanvasState,
	gesture: Gesture,
): CanvasState => {
	const events: CanvasEvent[] = [gesture];

	if (gesture.targetKind === "canvas") {
		let nextState = state;
		for (const event of events) {
			nextState = handleCanvasEvent(nextState, event);
		}
		return nextState;
	}

	if (gesture.targetKind === "object") {
		let nextState = state;
		for (const event of events) {
			nextState = handleObjectEvent(nextState, event);
		}
		return nextState;
	}

	if (gesture.targetKind === "control") {
		let nextState = state;
		for (const event of events) {
			nextState = handleControlEvent(nextState, event);
		}
		return nextState;
	}

	return state;
};
