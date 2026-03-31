import { autoSelectParentGroups } from "./autoSelectParentGroups";
import { getAncestors } from "./getAncestors";
import { hasSelectedChildren } from "./hasSelectedChildren";
import type {
	ClickEventHandler,
	ClickEventHandlerParams,
} from "../../../registry/ObjectRegistryTypes";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/GroupState";

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
	const { id } = objectState;

	// Only handle left-click (button 0)
	if (button !== 0) {
		return canvasState;
	}

	const isAdditive = mods.ctrl || mods.meta;
	const isCurrentlySelected = canvasState.selectedIds.includes(id);

	// Get ancestors of the clicked object
	const ancestors = getAncestors(canvasState, id);
	const isGroupedItem = ancestors.length > 0;

	// Determine the new selection target and whether to select or deselect
	let newSelectionTargetId: string;
	let shouldSelectTarget = true;

	if (!isGroupedItem) {
		// ========== Non-grouped item selection logic ==========
		// (svg-canvas lines 68-80)

		if (!isCurrentlySelected) {
			// Not selected: select it
			newSelectionTargetId = id;
		} else if (isAdditive) {
			// Already selected + Ctrl: deselect it
			newSelectionTargetId = id;
			shouldSelectTarget = false;
		} else {
			// Already selected + no Ctrl: no change
			return canvasState;
		}
	} else {
		// ========== Grouped item selection logic ==========
		// (svg-canvas lines 82-202)

		// Find if any ancestor is selected
		const selectedAncestorIdx = ancestors.findIndex((ancestorId) =>
			canvasState.selectedIds.includes(ancestorId),
		);
		const isAncestorSelected = selectedAncestorIdx >= 0;

		if (isAncestorSelected) {
			// --- Case 1: An ancestor is selected ---
			// (svg-canvas lines 83-133)

			const selectedAncestorId = ancestors[selectedAncestorIdx];
			const isParentSelected = selectedAncestorIdx === ancestors.length - 1;

			if (isParentSelected) {
				// Immediate parent is selected
				if (!isCurrentlySelected) {
					if (!isAdditive) {
						// Select the clicked child
						newSelectionTargetId = id;
					} else {
						// Ctrl: deselect the parent
						newSelectionTargetId = selectedAncestorId;
						shouldSelectTarget = false;
					}
				} else {
					// Child already selected: no change
					return canvasState;
				}
			} else {
				// Ancestor (not immediate parent) is selected
				if (!isCurrentlySelected) {
					if (!isAdditive) {
						// Select next level down toward the clicked item
						newSelectionTargetId = ancestors[selectedAncestorIdx + 1];
					} else {
						// Ctrl: deselect the selected ancestor
						newSelectionTargetId = selectedAncestorId;
						shouldSelectTarget = false;
					}
				} else {
					// Item already selected: no change
					return canvasState;
				}
			}
		} else {
			// --- Case 2: No ancestor selected ---
			// Check for siblings and common ancestors

			// Check if any sibling is selected (same parent has selected children)
			// (svg-canvas lines 135-155)
			const parentWithSelectedChild = ancestors.find((ancestorId) =>
				hasSelectedChildren(canvasState, ancestorId),
			);

			if (parentWithSelectedChild) {
				// Sibling is selected in the same group
				if (!isCurrentlySelected) {
					// Select the clicked item (same level as sibling)
					newSelectionTargetId = id;
				} else if (isAdditive) {
					// Ctrl + already selected: deselect
					newSelectionTargetId = id;
					shouldSelectTarget = false;
				} else {
					// Already selected: no change
					return canvasState;
				}
			} else {
				// --- Case 3: Check for common ancestor with other selections ---
				// (svg-canvas lines 157-200)

				if (canvasState.selectedIds.length > 0) {
					// Find common ancestor with other selected items
					const reversedAncestors = [...ancestors].reverse();
					const commonAncestorIdx = reversedAncestors.findIndex(
						(ancestorId) => {
							const ancestor = canvasState.objects[ancestorId];
							if (!ancestor || ancestor.type !== "group") {
								return false;
							}
							const group = ancestor as GroupState;
							// Check if this ancestor contains any selected items
							return canvasState.selectedIds.some((selectedId) => {
								return group.childIds.includes(selectedId);
							});
						},
					);

					if (commonAncestorIdx >= 0) {
						// Common ancestor found
						if (!isCurrentlySelected) {
							if (commonAncestorIdx === 0) {
								// Clicked item is direct child of common ancestor: select it
								newSelectionTargetId = id;
							} else {
								// Select the ancestor level to match other selections
								newSelectionTargetId =
									reversedAncestors[commonAncestorIdx - 1];
							}
						} else if (isAdditive) {
							// Ctrl: deselect
							newSelectionTargetId = id;
							shouldSelectTarget = false;
						} else {
							// Already selected: no change
							return canvasState;
						}
					} else {
						// No common ancestor: select topmost ancestor
						if (!isCurrentlySelected) {
							newSelectionTargetId = ancestors[0];
						} else if (isAdditive) {
							// Ctrl: deselect
							newSelectionTargetId = id;
							shouldSelectTarget = false;
						} else {
							// Already selected: no change
							return canvasState;
						}
					}
				} else {
					// No other selections: select topmost ancestor
					if (!isCurrentlySelected) {
						newSelectionTargetId = ancestors[0];
					} else if (isAdditive) {
						// Ctrl: deselect
						newSelectionTargetId = id;
						shouldSelectTarget = false;
					} else {
						// Already selected: no change
						return canvasState;
					}
				}
			}
		}
	}

	// ========== Update selectedIds based on determined target ==========

	let selectedIds: string[];

	if (isAdditive) {
		// Ctrl/Meta mode: toggle or add
		if (shouldSelectTarget) {
			// Add to selection (if not already there)
			selectedIds = canvasState.selectedIds.includes(newSelectionTargetId)
				? canvasState.selectedIds
				: [...canvasState.selectedIds, newSelectionTargetId];
		} else {
			// Remove from selection
			selectedIds = canvasState.selectedIds.filter(
				(sid) => sid !== newSelectionTargetId,
			);
		}
	} else {
		// Normal mode: single selection
		selectedIds = shouldSelectTarget ? [newSelectionTargetId] : [];
	}

	// ========== Auto-select parent groups if all children are selected ==========
	// (svg-canvas lines 264-311)
	selectedIds = autoSelectParentGroups(canvasState, selectedIds);

	return {
		...canvasState,
		selectedIds,
	};
};
