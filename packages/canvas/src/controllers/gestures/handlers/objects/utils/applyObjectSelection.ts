import { determineSelection } from "./determineSelection";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createMultiSelectGroup } from "../../../../utils/createMultiSelectGroup";
import type { Mods } from "../../../registry/ObjectBehaviorTypes";

/**
 * Writes the hierarchical selection decision for an object into the state.
 * Shared by the left-button click (ObjectEventHandler) and by the right
 * button / long press that opens the context menu (CanvasEventHandler), so both
 * resolve groups and multi-selections the same way.
 *
 * @param canvasState - Current canvas controller state
 * @param targetObject - The object the interaction landed on; must be the entry
 *   from canvasState.objects, not a detached copy
 * @param mods - Keyboard modifiers handed to determineSelection; ctrl / meta /
 *   shift make the selection additive
 * @returns The state with the new selection, or canvasState itself when
 *   determineSelection reports no change (an already-selected target)
 */
export function applyObjectSelection(
	canvasState: CanvasControllerState,
	targetObject: ObjectState,
	mods: Mods,
): CanvasControllerState {
	// Determine the new selection via hierarchical selection logic
	const selectedIds = determineSelection(targetObject, canvasState, mods);

	// Return the current state if there is no change
	if (selectedIds === null) {
		return canvasState;
	}

	// For multi-selection, create a multiSelectGroup
	let multiSelectGroup = null;
	if (1 < selectedIds.length) {
		multiSelectGroup = createMultiSelectGroup(
			selectedIds,
			canvasState.objects,
			canvasState.multiSelectGroup,
		);
	}

	return {
		...canvasState,
		// Shapes only: determineSelection builds the list from the shapes alone, so
		// a connector that was selected is gone from it. The picked part goes with
		// the object selection that carried it.
		selection: { objectIds: selectedIds, part: null },
		multiSelectGroup,
		// Close the submenu on selection change
		objectMenuOpenId: null,
		stencilLibraryOpenCategory: null,
	};
}
