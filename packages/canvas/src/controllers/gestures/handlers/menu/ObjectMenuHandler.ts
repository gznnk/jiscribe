import { handleCommand } from "../../../commands/handlers/handleCommand";
import { handlePropertyUpdate } from "../../../utils/handlePropertyUpdate";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";

/**
 * GestureHandler that processes ObjectMenu item interactions.
 * Handles events when targetKind is "object-menu".
 *
 * Property updates from the ObjectMenu take two paths:
 * (1) This handler: via the gesture system (set: / slider:). Most property changes go through here.
 * (2) The MENU_PROPERTY_UPDATE case in canvasReducer: via React onChange (e.g. number-input). Does not go through here.
 * Logic needed by both paths (such as clearing selectedVertex) must be added to each of them.
 *
 * Events handled:
 * - click: menu item click
 * - drag: real-time slider update (no history recording)
 * - dragEnd: commit the slider's final value + record history
 *
 * targetId formats:
 * - `object-menu:toggle:{sectionId}` → toggle a section open/closed
 * - `object-menu:set:{property}:{value}` → update a property of the selected object
 * - `object-menu:command:{commandId}` → execute a command
 * - `object-menu:slider:{property}` → property update via slider
 * - `object-menu:number-input:{property}` → property update via numeric input
 */
export const ObjectMenuHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return event.targetKind === "object-menu";
	},

	handle(state, event) {
		let nextState = state;

		// A press on the ObjectMenu closes the context menu (the press itself performs no item action)
		if (event.type === "pressed") {
			if (event.button === 0) {
				nextState = { ...nextState, contextMenuPosition: null };
			}
		}

		// Slider interaction: drag / dragEnd
		if (event.targetId?.startsWith("object-menu:slider:")) {
			// pressed, dragStart, and click events do nothing and keep the state (values update on drag / dragEnd)
			if (
				event.type === "pressed" ||
				event.type === "dragStart" ||
				event.type === "click" ||
				event.type === "doubleClick"
			) {
				return nextState;
			}

			// Do nothing if there is no input value
			if (event.inputValue === undefined) {
				console.warn("[ObjectMenuHandler] No input value found");
				return state;
			}

			// Strip the "object-menu:slider:" prefix from targetId to get the property name
			const property = event.targetId.slice("object-menu:slider:".length);
			if (!property) {
				console.warn("[ObjectMenuHandler] No property found in targetId");
				return state;
			}

			// drag event: real-time update (no history recording, menu stays open)
			if (event.type === "drag") {
				const newState = handlePropertyUpdate(
					state,
					property,
					event.inputValue,
				);
				return { ...newState, selectedVertex: null };
			}

			// dragEnd event: commit the final value (history recording is delegated to handleGesture)
			if (event.type === "dragEnd") {
				const newState = handlePropertyUpdate(
					state,
					property,
					event.inputValue,
				);
				return {
					...newState,
					selectedVertex: null,
					commitVersion: state.commitVersion + 1,
				};
			}

			return state;
		}

		// Menu item click
		if (event.type === "click" && event.targetId) {
			// Strip the "object-menu:" prefix from targetId to get the action
			const actionId = event.targetId.slice("object-menu:".length);

			// toggle button: toggle a section open/closed
			if (actionId.startsWith("toggle:")) {
				const sectionId = actionId.slice("toggle:".length);
				return {
					...state,
					objectMenuOpenId:
						state.objectMenuOpenId === sectionId ? null : sectionId,
				};
			}

			// Property update: set:{property}:{value}
			if (actionId.startsWith("set:")) {
				const rest = actionId.slice("set:".length);
				const colonIndex = rest.indexOf(":");
				if (colonIndex !== -1) {
					const property = rest.slice(0, colonIndex);
					const value = rest.slice(colonIndex + 1);
					const newState = handlePropertyUpdate(state, property, value);
					// History recording is delegated to handleGesture, so only update commitVersion
					return {
						...newState,
						selectedVertex: null,
						commitVersion: state.commitVersion + 1,
					};
				}
			}

			// Command button: command:{commandId}
			if (actionId.startsWith("command:")) {
				const commandId = actionId.slice("command:".length);
				return handleCommand(state, commandId);
			}
		}

		return nextState;
	},
};
