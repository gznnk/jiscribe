import type { ObjectPartKindRegistry } from "../../../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { selectConnectorAlone } from "../../../../selection/writers/selectConnectorAlone";
import { selectObjectByClick } from "../../../../selection/writers/selectObjectByClick";
import type { ConnectorRouteRegistries } from "../../../../utils/VisualExtentRegistries";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { getAncestors } from "../../objects/utils/getAncestors";
import { connectorLabelPart } from "../../utils/partAddress";
import { selectPartByClick } from "../../utils/selectPartByClick";

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
 * of its members (a left click would drill into the group instead). A connector
 * is picked into as a left click picks into it: its label when the gesture
 * landed on the label box, nothing below it otherwise, so a Delete from the menu
 * takes what was pointed at.
 *
 * Only the kinds a left click would select are handled; a control handle, the
 * menu itself and the canvas background keep the selection as it is.
 *
 * @param state - Current canvas controller state
 * @param event - The right-button or longPress event; its targetKind /
 *   targetId choose the target and its own mods are ignored
 * @param registries - Per-canvas registries the multi-select frame resolves a
 *   selected connector's drawn route through (see createMultiSelectGroup), and
 *   the part kinds a connector's label pick is checked against
 *   (selectPartByClick)
 * @returns The state with the target selected, or state itself when the gesture
 *   landed on nothing selectable, on a shape already selected (itself or
 *   through an ancestor group), or on a connector already selected with the
 *   same pick below it
 */
export function selectContextMenuTarget(
	state: CanvasControllerState,
	event: CanvasEvent,
	registries: ConnectorRouteRegistries & {
		objectPartKind: ObjectPartKindRegistry;
	},
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
			registries,
		);
	}
	if (event.targetKind === "connector") {
		const selectedState = selectConnectorAlone(state, targetId);
		return selectPartByClick(
			selectedState,
			selectedState.objects[targetId],
			event.targetAction === "label" ? connectorLabelPart() : undefined,
			registries.objectPartKind,
		);
	}
	return state;
}
