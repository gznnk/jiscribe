import type {
	CanvasGesture,
	GestureHandler,
} from "../../../registry/GestureHandlerRegistryTypes";
import { objectRegistry } from "../../../registry/ObjectRegistry";
import type { CanvasState } from "../../../states/canvas/CanvasState";

/**
 * Handles events that occur on objects (not on canvas).
 * This is the main entry point for object-level event handling.
 *
 * Note: eventStartState is managed by handleGesture(), not here.
 */
export const ObjectEventHandler: GestureHandler = {
	supports(gesture: CanvasGesture): boolean {
		return gesture.targetKind === "object";
	},

	handle(state: CanvasState, gesture: CanvasGesture): CanvasState {
		const targetObjectId = gesture.targetId;
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
		if (gesture.type === "click" && eventHandler.onClick) {
			const clickHandlerParams = {
				objectState: targetObject,
				canvasState: nextState,
				mods: gesture.mods,
				time: gesture.time,
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
				delta: gesture.delta,
				objectState: objectStartState,
				canvasState: nextState,
				mods: gesture.mods,
				time: gesture.time,
			};

			if (gesture.type === "dragStart" && eventHandler.onDragStart) {
				nextState = eventHandler.onDragStart(dragHandlerParams);
			} else if (gesture.type === "drag" && eventHandler.onDrag) {
				nextState = eventHandler.onDrag(dragHandlerParams);
			} else if (gesture.type === "dragEnd" && eventHandler.onDragEnd) {
				nextState = eventHandler.onDragEnd(dragHandlerParams);
			}
		}

		return nextState;
	},
};
