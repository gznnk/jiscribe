import type { MenuPart } from "./menuParts";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../../registries/ICanvasRegistries";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";

/**
 * Applies a menu part that writes a style property of the selection — `set:` or
 * `slider:` — through StylePropertyRegistry, the same way from every surface that
 * carries such parts (the ObjectMenu and the properties sidebar).
 *
 * The React onChange route (STYLE_PROPERTY_UPDATE in canvasReducer) writes the
 * same properties without passing through here; logic both routes need (such as
 * clearing selectedVertex) has to be added to each of them.
 *
 * @param state - State to write into, with the caller's own press dismiss already applied: a slider press returns from here
 * @param event - The gesture. `set:` acts on click / doubleClick only. `slider:` previews on pressed / dragStart / drag and commits on dragEnd / click / doubleClick, reading the value from `inputValue`; a slider event without one warns and changes nothing
 * @param part - `event.targetPart` already parsed (parseMenuPart); null and kinds other than `set` / `slider` are left to the caller
 * @param registries - Registries of the canvas; `styleProperty` resolves the property name
 * @returns The next state, or null when the part is not a style write. A commit bumps `commitVersion` (history recording is left to handleGesture's caller); every write clears `selectedVertex`. A style part on an event it does not act on returns `state` itself
 */
export const applyStylePropertyPart = (
	state: CanvasControllerState,
	event: CanvasEvent,
	part: MenuPart | null,
	registries: ICanvasRegistries,
): CanvasControllerState | null => {
	if (part?.kind === "set") {
		// doubleClick activates like click (the ToolbarHandler pattern): the
		// recognizer pairs any two rapid same-position clicks without comparing
		// targets, so the second press of a toggle whose data-part changes with the
		// value (set:fontWeight:bold → set:fontWeight:normal) arrives as doubleClick
		// and must still fire. Each pointerup emits exactly one of the two.
		if (event.type !== "click" && event.type !== "doubleClick") {
			return state;
		}
		const newState = registries.styleProperty.apply(
			state,
			part.property,
			part.value,
			registries.objectPartKind,
		);
		return {
			...newState,
			selectedVertex: null,
			commitVersion: state.commitVersion + 1,
		};
	}

	if (part?.kind !== "slider") {
		return null;
	}

	if (event.inputValue === undefined) {
		console.warn("[applyStylePropertyPart] No input value found");
		return state;
	}

	const { property } = part;
	if (!property) {
		console.warn("[applyStylePropertyPart] No property found in targetPart");
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
		const newState = registries.styleProperty.apply(
			state,
			property,
			event.inputValue,
			registries.objectPartKind,
		);
		return { ...newState, selectedVertex: null };
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
		const newState = registries.styleProperty.apply(
			state,
			property,
			event.inputValue,
			registries.objectPartKind,
		);
		return {
			...newState,
			selectedVertex: null,
			commitVersion: state.commitVersion + 1,
		};
	}

	return state;
};
