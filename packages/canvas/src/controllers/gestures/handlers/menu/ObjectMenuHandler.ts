import { handleCommand } from "../../../commands/handlers/handleCommand";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

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
 * - click / doubleClick: menu item activation (equivalent; see the comment at the branch),
 *   or a commit of the slider value the native track click already produced
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
		return (
			event.targetKind === "menu" &&
			event.targetId === "object-menu" &&
			isPerTargetInteraction(event)
		);
	},

	handle(state, event, registries) {
		let nextState = state;

		// A press on the ObjectMenu closes the context menu (the press itself performs no item action)
		if (event.type === "pressed") {
			nextState = { ...nextState, contextMenuPosition: null };
		}

		// Slider interaction: drag / dragEnd / click
		if (event.targetPart?.startsWith("slider:")) {
			// pressed and dragStart do nothing and keep the state (values update on drag / dragEnd / click)
			if (event.type === "pressed" || event.type === "dragStart") {
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
				const newState = registries.styleProperty.apply(
					state,
					property,
					event.inputValue,
				);
				return { ...newState, selectedVertex: null };
			}

			// dragEnd: commit the final value (history recording is delegated to handleGesture).
			// click / doubleClick: a press on the track jumps the thumb natively and lifts
			// without ever crossing the drag threshold, so no drag/dragEnd pair fires and the
			// value the browser already wrote would otherwise never reach the doc (#248).
			// Since pointerup emits exactly one of dragEnd / click / doubleClick, this cannot
			// commit twice.
			if (
				event.type === "dragEnd" ||
				event.type === "click" ||
				event.type === "doubleClick"
			) {
				const newState = registries.styleProperty.apply(
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

		// Menu item activation. doubleClick activates like click (the ToolbarHandler
		// pattern): the recognizer pairs any two rapid same-position clicks without
		// comparing targets, so the second press of a toggle whose data-part changes
		// with the value (set:fontWeight:bold → set:fontWeight:normal) arrives as
		// doubleClick and must still fire. Each pointerup emits exactly one of
		// click / doubleClick, so this cannot run an action twice.
		if (
			(event.type === "click" || event.type === "doubleClick") &&
			event.targetPart
		) {
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
					const newState = registries.styleProperty.apply(
						state,
						property,
						value,
					);
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
				return handleCommand(state, commandId, registries);
			}
		}

		return nextState;
	},
};
