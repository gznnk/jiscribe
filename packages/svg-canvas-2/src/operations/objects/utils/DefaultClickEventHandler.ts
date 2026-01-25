import type {
	ClickEventHandler,
	ClickEventHandlerParams,
} from "../../../registry/ObjectRegistryTypes";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Default click event handler that updates selection state based on modifiers.
 * - If Ctrl (or Meta on Mac) is pressed: toggles the clicked object in selectedIds
 * - Otherwise: sets selectedIds to only the clicked object
 * - Only handles left-click (button 0)
 */
export const DefaultClickEventHandler: ClickEventHandler<ObjectState> = (
	params: ClickEventHandlerParams<ObjectState>,
) => {
	const { objectState, canvasState, mods, button } = params;
	const { id } = objectState;

	// Only handle left-click (button 0)
	if (button !== 0) {
		return canvasState;
	}

	// Check if Ctrl or Meta (Cmd on Mac) is pressed for additive selection
	const isAdditive = mods.ctrl || mods.meta;

	// Update selection based on modifiers
	let selectedIds: string[];
	if (isAdditive) {
		// Ctrl/Meta pressed: toggle selection
		if (canvasState.selectedIds.includes(id)) {
			// Remove from selection
			selectedIds = canvasState.selectedIds.filter((sid) => sid !== id);
		} else {
			// Add to selection
			selectedIds = [...canvasState.selectedIds, id];
		}
	} else {
		// No Ctrl/Meta: select only this object
		selectedIds = [id];
	}

	// Update canvas state with new selection
	return {
		...canvasState,
		selectedIds,
	};
};
