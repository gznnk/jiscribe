import type { CanvasControllerState } from "../../../../CanvasTypes";
import { selectConnectorAlone } from "../../../../selection/writers/selectConnectorAlone";
import { selectObjectByClick } from "../../../../selection/writers/selectObjectByClick";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { getAncestors } from "../../objects/utils/getAncestors";

/**
 * Right-click and long press never add to the selection: Ctrl+right-click
 * extending a selection is not a behavior any editor offers, and the modifiers
 * on the event belong to whatever the menu command does.
 */
const NON_ADDITIVE_MODS = {
	shift: false,
	alt: false,
	ctrl: false,
	meta: false,
} as const;

/**
 * Selects what a context-menu gesture (right button or long press) landed on, so
 * the menu acts on the pointed-at shape rather than on whatever was selected
 * before. A target already in the selection, or inside a selected group, leaves
 * it untouched, which is what lets a multi-selection survive a right click on one
 * of its members (a left click would drill into the group instead).
 *
 * Only the kinds a left click would select are handled; a control handle, the
 * menu itself and the canvas background keep the selection as it is.
 *
 * @param state - Current canvas controller state
 * @param event - The right-button or longPress event; its targetKind /
 *   targetId choose the target and its own mods are ignored
 * @returns The state with the target selected, or state itself when the gesture
 *   landed on nothing selectable or on something already selected (itself or
 *   through an ancestor group)
 */
export function selectContextMenuTarget(
	state: CanvasControllerState,
	event: CanvasEvent,
): CanvasControllerState {
	const { targetId } = event;
	if (!targetId || !state.objects[targetId]) {
		return state;
	}

	// The two selectable kinds, matching ObjectEventHandler.supports (object) and
	// ConnectorClickHandler.supports (connector).
	if (event.targetKind === "object") {
		const selectedIds = state.selection.objectIds;
		const isCoveredBySelection =
			selectedIds.includes(targetId) ||
			getAncestors(state, targetId).some((ancestorId) =>
				selectedIds.includes(ancestorId),
			);
		if (isCoveredBySelection) {
			return state;
		}
		return selectObjectByClick(
			state,
			state.objects[targetId],
			NON_ADDITIVE_MODS,
		);
	}
	if (event.targetKind === "connector") {
		return selectConnectorAlone(state, targetId);
	}
	return state;
}
