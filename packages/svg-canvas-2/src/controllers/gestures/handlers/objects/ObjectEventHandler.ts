import type {
	CanvasEvent,
	GestureHandler,
} from "../../../../registry/GestureHandlerRegistryTypes";
import { objectRegistry } from "../../../../registry/ObjectRegistry";
import type { CanvasState } from "../../../../states/canvas/CanvasState";

/**
 * Handles events that occur on objects (not on canvas).
 * This is the main entry point for object-level event handling.
 *
 * Note: eventStartState is managed by handleGesture(), not here.
 */
export const ObjectEventHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return event.targetKind === "object";
	},

	handle(state: CanvasState, event: CanvasEvent): CanvasState {
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

		// For click events, we don't need eventStartState
		if (event.type === "click" && eventHandler.onClick) {
			const clickHandlerParams = {
				objectState: targetObject,
				canvasState: nextState,
				mods: event.mods,
				time: event.time,
				button: event.button,
			};
			nextState = eventHandler.onClick(clickHandlerParams);
		} else {
			// For drag events, we need eventStartState
			const objectStartState =
				nextState.eventStartState?.objects[targetObjectId];
			if (!objectStartState) {
				return nextState;
			}

			// Prepare common parameters for drag event handlers
			const dragHandlerParams = {
				delta: event.delta,
				objectState: objectStartState,
				canvasState: nextState,
				mods: event.mods,
				time: event.time,
				button: event.button,
			};

			if (event.type === "dragStart" && eventHandler.onDragStart) {
				nextState = eventHandler.onDragStart(dragHandlerParams);
			} else if (event.type === "drag" && eventHandler.onDrag) {
				nextState = eventHandler.onDrag(dragHandlerParams);
			} else if (event.type === "dragEnd" && eventHandler.onDragEnd) {
				nextState = eventHandler.onDragEnd(dragHandlerParams);
			}
		}

		return nextState;
	},
};
