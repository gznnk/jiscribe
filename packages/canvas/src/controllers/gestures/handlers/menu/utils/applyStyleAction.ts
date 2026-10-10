import type { MenuAction } from "./menuActions";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../../registries/ICanvasRegistries";
import { styleIntentOf } from "../../../../style/intent/styleIntentOf";
import { applyStyleIntent } from "../../../../style/walk/applyStyleIntent";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";

/**
 * Reflects what an action's name and string state, or leaves the state as it is for
 * a value nothing can be made of.
 */
const applyActionValue = (
	state: CanvasControllerState,
	property: string,
	value: string,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const intent = styleIntentOf(property, value);
	return intent === undefined
		? state
		: applyStyleIntent(state, intent, registries);
};

/**
 * Applies a menu action that writes a style property of the selection — `set:`
 * or `slider:` — the same way from every surface that carries such actions (the
 * ObjectMenu and the properties sidebar): the action's name and string are read
 * into an intent (styleIntentOf) and applied (applyStyleIntent).
 *
 * The React onChange route (STYLE_INTENT in canvasReducer) ends at the same
 * apply, having been handed the intent already — a widget holding a name and a
 * string reads it through the same styleIntentOf before it dispatches. What is
 * not shared is the commit tail: logic both routes need has to be added to each
 * of them.
 *
 * @param state - State to write into, with the caller's own press dismiss already applied: a slider press returns from here
 * @param event - The gesture. `set:` acts on click / doubleClick only. `slider:` previews on pressed / dragStart / drag and commits on dragEnd / click / doubleClick, reading the value from `inputValue`; a slider event without one warns and changes nothing
 * @param action - `event.targetAction` already parsed (parseMenuAction); null and kinds other than `set` / `slider` are left to the caller
 * @param registries - Registries of the canvas; its style tables are what answer the intent the action states
 * @returns The next state, or null when the action is not a style write. A commit bumps `commitVersion` (history recording is left to handleGesture's caller); a write leaves the part picked below the object alone, styling never renumbering what it writes to. A style action on an event it does not act on returns `state` itself
 */
export const applyStyleAction = (
	state: CanvasControllerState,
	event: CanvasEvent,
	action: MenuAction | null,
	registries: ICanvasRegistries,
): CanvasControllerState | null => {
	if (action?.kind === "set") {
		// doubleClick activates like click (the ToolbarHandler pattern): the
		// recognizer pairs any two rapid same-position clicks without comparing
		// targets, so the second press of a toggle whose data-action changes with the
		// value (set:fontWeight:bold → set:fontWeight:normal) arrives as doubleClick
		// and must still fire. Each pointerup emits exactly one of the two.
		if (event.type !== "click" && event.type !== "doubleClick") {
			return state;
		}
		const newState = applyActionValue(
			state,
			action.property,
			action.value,
			registries,
		);
		return {
			...newState,
			commitVersion: state.commitVersion + 1,
		};
	}

	if (action?.kind !== "slider") {
		return null;
	}

	if (event.inputValue === undefined) {
		console.warn("[applyStyleAction] No input value found");
		return state;
	}

	const { property } = action;
	if (!property) {
		console.warn("[applyStyleAction] No property found in targetAction");
		return state;
	}

	// pressed and dragStart must apply too: the browser writes the value natively
	// from the moment of the pointerdown (the thumb jumps to the press point, then
	// steps under the drag slop), and the first drag only fires on the pointermove
	// after the slop is crossed — without applying here the canvas lags those first
	// steps for as long as the pointer is held.
	if (
		event.type === "pressed" ||
		event.type === "dragStart" ||
		event.type === "drag"
	) {
		return applyActionValue(state, property, event.inputValue, registries);
	}

	// click / doubleClick: a press on the track jumps the thumb natively and lifts
	// without ever crossing the drag threshold, so no drag/dragEnd pair fires and
	// the value the browser already wrote would otherwise never reach the doc
	// (#248). Since pointerup emits exactly one of dragEnd / click / doubleClick,
	// this cannot commit twice.
	if (
		event.type === "dragEnd" ||
		event.type === "click" ||
		event.type === "doubleClick"
	) {
		const newState = applyActionValue(
			state,
			property,
			event.inputValue,
			registries,
		);
		return {
			...newState,
			commitVersion: state.commitVersion + 1,
		};
	}

	return state;
};
