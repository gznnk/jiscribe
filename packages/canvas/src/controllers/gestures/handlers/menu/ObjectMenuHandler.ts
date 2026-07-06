import { handleCommand } from "../../../commands/handlers/handleCommand";
import { handlePropertyUpdate } from "../../../utils/handlePropertyUpdate";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";

/**
 * GestureHandler that processes ObjectMenu item interactions.
 * Handles events with targetKind "menu" and targetId "object-menu".
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
 * targetPart formats (absent = the menu chrome itself, e.g. bar / panel background):
 * - `toggle:{sectionId}` → toggle a section open/closed
 * - `set:{property}:{value}` → update a property of the selected object
 * - `command:{commandId}` → execute a command
 * - `slider:{property}` → property update via slider
 */
export const ObjectMenuHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		// Left button only: other buttons fall through to CanvasEventHandler's
		// canvas-level right-button behavior (#110)
		return (
			event.button === 0 &&
			event.targetKind === "menu" &&
			event.targetId === "object-menu"
		);
	},

	handle(state, event) {
		let nextState = state;

		// A press on the ObjectMenu closes the context menu (the press itself performs no item action)
		if (event.type === "pressed") {
			nextState = { ...nextState, contextMenuPosition: null };
		}

		// Slider interaction: drag / dragEnd
		if (event.targetPart?.startsWith("slider:")) {
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

			// Strip the "slider:" prefix from targetPart to get the property name
			const property = event.targetPart.slice("slider:".length);
			if (!property) {
				console.warn("[ObjectMenuHandler] No property found in targetPart");
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
		if (event.type === "click" && event.targetPart) {
			const actionId = event.targetPart;

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
