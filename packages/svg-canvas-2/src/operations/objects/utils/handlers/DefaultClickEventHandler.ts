import type {
	ClickEventHandler,
	ClickEventHandlerParams,
} from "../../../../registry/ObjectRegistryTypes";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { createMultiSelectGroup } from "../createMultiSelectGroup";
import { determineSelection } from "../determineSelection";

/**
 * Hierarchical click event handler with group-aware selection logic.
 *
 * This implements the complex selection behavior from svg-canvas (useOnSelect.ts):
 * - Click on ungrouped item: select it
 * - Click on grouped item: select based on hierarchy state
 * - Click again: walk up the parent hierarchy
 * - Ctrl+Click: toggle selection / add to selection
 *
 * The logic handles:
 * 1. Non-grouped items (no ancestors)
 * 2. Grouped items with selected ancestors
 * 3. Grouped items with selected siblings
 * 4. Grouped items with other selections (common ancestor logic)
 *
 * Only handles left-click (button 0)
 */
export const DefaultClickEventHandler: ClickEventHandler<ObjectState> = (
	params: ClickEventHandlerParams<ObjectState>,
) => {
	const { objectState, canvasState, mods, button } = params;

	// Only handle left-click (button 0)
	if (button !== 0) {
		return canvasState;
	}

	// Determine new selection using shared logic
	const selectedIds = determineSelection(objectState, canvasState, mods);

	// If no change, return current state
	if (selectedIds === null) {
		return canvasState;
	}

	// Create multiSelectGroup if multiple items are selected
	let multiSelectGroup = null;
	if (1 < selectedIds.length) {
		multiSelectGroup = createMultiSelectGroup(selectedIds, canvasState.objects);
	}

	return {
		...canvasState,
		selectedIds,
		multiSelectGroup,
	};
};
