import { useCallback, useRef } from "react";

import type { DiagramSelectEvent } from "../../../types/events/DiagramSelectEvent";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { GroupState } from "../../../types/state/shapes/GroupState";
import { getDiagramById } from "../../../utils/core/getDiagramById";
import { getSelectedDiagrams } from "../../../utils/core/getSelectedDiagrams";
import { isItemableState } from "../../../utils/validation/isItemableState";
import { isSelectableState } from "../../../utils/validation/isSelectableState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { applyFunctionRecursively } from "../../utils/applyFunctionRecursively";
import { createMultiSelectGroup } from "../../utils/createMultiSelectGroup";
import { createSelectedDiagramPathIndex } from "../../utils/createSelectedDiagramPathIndex";
import { getAncestorItemsById } from "../../utils/getAncestorItemsById";
import { updateOutlineBySelection } from "../../utils/updateOutlineBySelection";
import { updateRootSelectedState } from "../../utils/updateRootSelectedState";

/**
 * Custom hook to handle select events on the canvas.
 */
export const useOnSelect = (
	props: SvgCanvasSubHooksProps,
	isCtrlPressed?: boolean,
) => {
	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
		isCtrlPressed,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback((e: DiagramSelectEvent) => {
		// Bypass references to avoid function creation in every render.
		const {
			props: { setCanvasState },
			isCtrlPressed,
		} = refBus.current;

		setCanvasState((prevState) => {
			// Check the selection state of the item triggering the event.
			const eventTriggeredItem = getDiagramById(prevState.items, e.id);
			const isEventTriggeredItemSelected =
				isSelectableState(eventTriggeredItem) && eventTriggeredItem.isSelected;
			// Get the ancestors of the selected item.
			const ancestorsOfSelectingItem = getAncestorItemsById(
				e.id,
				prevState.items,
			);

			// If the ancestors of the selected item are empty, it means the item is not part of a group.
			const isGroupedItemSelection = ancestorsOfSelectingItem.length > 0;
			// Find the index of the first ancestor that is selected.
			const selectedAncestorIdx = ancestorsOfSelectingItem.findIndex(
				(ancestor) => isSelectableState(ancestor) && ancestor.isSelected,
			);
			// Check if the selected ancestor is selected.
			const isAncestorSelected = selectedAncestorIdx >= 0;

			// Check if this is a ctrl+click deselection of an already selected item
			const isCtrlClickDeselectCondition =
				isCtrlPressed && e.isTriggeredByClick && e.isSelectedOnPointerDown;

			// Calculate the new selection target ID based on the selection mode.
			let newSelectionTargetId: string;
			let newSelectionState = true;

			if (!isGroupedItemSelection) {
				// Non-grouped item selection logic.
				if (!isEventTriggeredItemSelected) {
					// If the item is not selected and not part of a group, select the item.
					newSelectionTargetId = e.id;
				} else if (isCtrlClickDeselectCondition) {
					// If the item is already selected, deselect it.
					newSelectionTargetId = e.id;
					newSelectionState = false;
				} else {
					// If the item is already selected and Ctrl is not pressed, do nothing.
					return prevState;
				}
			} else {
				// Grouped item selection logic.
				if (isAncestorSelected) {
					if (!e.isTriggeredByClick) {
						// If the selection is not triggered by a click, do not change the selection state.
						return prevState;
					}
					if (!e.isAncestorSelectedOnPointerDown) {
						// If the ancestor is not selected on pointer down,
						// do not change the selection state.
						return prevState;
					}
					// Check if the selected ancestor is the parent of the selected item.
					const isSelectedAncestorIsParent =
						selectedAncestorIdx === ancestorsOfSelectingItem.length - 1;
					if (isSelectedAncestorIsParent) {
						if (!isEventTriggeredItemSelected) {
							if (!isCtrlPressed) {
								// If the selected ancestor is the parent of the selected item and Ctrl is not pressed,
								// select the item triggering the event.
								newSelectionTargetId = e.id;
							} else {
								// If the selected ancestor is the parent of the selected item and Ctrl is pressed,
								// deselect the parent item.
								newSelectionTargetId =
									ancestorsOfSelectingItem[selectedAncestorIdx].id;
								newSelectionState = false;
							}
						} else {
							// If the selected ancestor is the parent of the selected item and the item is already selected,
							// do not change the selection state.
							return prevState;
						}
					} else {
						if (!isEventTriggeredItemSelected) {
							if (!isCtrlPressed) {
								// If the selected ancestor is not the parent of the selected item and Ctrl is not pressed,
								// select the next unselected ancestor.
								newSelectionTargetId =
									ancestorsOfSelectingItem[selectedAncestorIdx + 1].id;
							} else {
								// If the selected ancestor is not the parent of the selected item and Ctrl is pressed,
								// deselect the ancestor item.
								newSelectionTargetId =
									ancestorsOfSelectingItem[selectedAncestorIdx].id;
								newSelectionState = false;
							}
						} else {
							// If the selected ancestor is not the parent of the selected item and the item is already selected,
							// do not change the selection state.
							return prevState;
						}
					}
				} else {
					// Check if any of the already selected items belong to the same group as the currently selected item.
					const isSelectedItemExistsInSameGroup = ancestorsOfSelectingItem.some(
						(ancestor) =>
							isItemableState(ancestor) &&
							ancestor.items.some((item) => item.id === e.id) &&
							ancestor.items.some(
								(item) => isSelectableState(item) && item.isSelected,
							),
					);
					if (isSelectedItemExistsInSameGroup) {
						if (!isEventTriggeredItemSelected) {
							// If the item is not selected and belongs to a group with selected items, select the item.
							newSelectionTargetId = e.id;
						} else if (isCtrlClickDeselectCondition) {
							// If the item is already selected and Ctrl is pressed, deselect the item.
							newSelectionTargetId = e.id;
							newSelectionState = false;
						} else {
							// If the item is already selected and Ctrl is not pressed, do nothing.
							return prevState;
						}
					} else {
						// Check if there is a common ancestor with selected items.
						const reversedAncestorsOfSelectingItem = ancestorsOfSelectingItem
							.slice()
							.reverse();
						const commonAncestorOfSelectedItemIdx =
							reversedAncestorsOfSelectingItem.findIndex(
								(ancestor) =>
									isItemableState(ancestor) &&
									getSelectedDiagrams(ancestor.items).length > 0,
							);
						if (0 <= commonAncestorOfSelectedItemIdx) {
							if (!isEventTriggeredItemSelected) {
								if (commonAncestorOfSelectedItemIdx === 0) {
									// If there is a common ancestor with selected items and the item is not selected,
									// select the item triggering the event.
									newSelectionTargetId = e.id;
								} else {
									// If there is a common ancestor with selected items, select the next unselected ancestor.
									newSelectionTargetId =
										reversedAncestorsOfSelectingItem[
											commonAncestorOfSelectedItemIdx - 1
										].id;
								}
							} else if (isCtrlClickDeselectCondition) {
								// If the item is already selected and Ctrl is pressed, deselect the item.
								newSelectionTargetId = e.id;
								newSelectionState = false;
							} else {
								// If the item is already selected and Ctrl is not pressed, do nothing.
								return prevState;
							}
						} else {
							if (!isEventTriggeredItemSelected) {
								// If there is no common ancestor with selected items, select the first ancestor.
								newSelectionTargetId = ancestorsOfSelectingItem[0].id;
							} else if (isCtrlClickDeselectCondition) {
								// If the item is already selected and Ctrl is pressed, deselect the item.
								newSelectionTargetId = e.id;
								newSelectionState = false;
							} else {
								// If the item is already selected and Ctrl is not pressed, do nothing.
								return prevState;
							}
						}
					}
				}
			}

			// Update the selected state of the items.
			let items = applyFunctionRecursively(prevState.items, (item) => {
				if (!isSelectableState(item)) {
					// Skip if the item is not selectable.
					return item;
				}

				if (item.id === newSelectionTargetId) {
					if (isCtrlPressed) {
						// If Ctrl is pressed, toggle the selection state of the item.
						return {
							...item,
							isSelected: newSelectionState,
							showOutline: newSelectionState,
						};
					}
					// Apply the selected state to the diagram.
					return {
						...item,
						isSelected: true,
						showOutline: true, // Show outline when selected.
					};
				}

				if (isCtrlPressed) {
					// If Ctrl is pressed, keep the current selection state.
					return {
						...item,
						showOutline: item.isSelected, // Keep outline visibility based on current selection state.
					};
				}

				// In single selection mode, clear the selection state of all items except the target item.
				return {
					...item,
					isSelected: false,
					showOutline: false, // Hide outline when not selected.
				};
			});

			// Multi-selection logic.

			// Get the selected diagrams from the updated state.
			const selectedItems = getSelectedDiagrams(items);

			// When multiple items are selected, create a dummy group to manage the selected items.
			let multiSelectGroup: GroupState | undefined = undefined;
			if (1 < selectedItems.length) {
				if (selectedItems.some((item) => item.type === "ConnectLine")) {
					// If the selected items include a connection line, keep their selection state unchanged to prevent grouping.
					return prevState;
				}
				// Create initial values for the multi-select group
				multiSelectGroup = createMultiSelectGroup(
					selectedItems,
					prevState.multiSelectGroup?.keepProportion,
				);

				// Process group selection and handle transform controls in one pass
				const processMultiSelectionLogic = (items: Diagram[]): Diagram[] => {
					const processItem = (item: Diagram): Diagram => {
						// First, recursively process all nested items (bottom-up approach)
						if (isItemableState(item) && isSelectableState(item)) {
							const updatedItems = item.items.map(processItem);

							// After processing children, check if this group should be selected
							if (
								!item.isSelected && // Only process groups that are not already selected
								updatedItems.length > 0 && // Ensure the group has children
								updatedItems.every(
									(child) => isSelectableState(child) && child.isSelected,
								) && // All children are selected
								item.itemableType !== "canvas" // Exclude the canvas itself
							) {
								// Deselect all children when the group is selected
								const deselectedItems = updatedItems.map((child) => {
									if (isSelectableState(child)) {
										return {
											...child,
											isSelected: false,
											showOutline: true, // Keep outline visible for children of selected groups
										};
									}
									return child;
								});
								return {
									...item,
									items: deselectedItems,
									isSelected: true,
									showOutline: true, // Show outline for the group.
								} as Diagram;
							}

							// If no selection change, return with updated items
							return {
								...item,
								items: updatedItems,
							} as Diagram;
						}

						return item;
					};

					return items.map(processItem);
				};

				items = processMultiSelectionLogic(items);
			}

			// After processing the selection, update the items to show outlines and transform controls based on selection state.
			items = updateOutlineBySelection(items);

			// Update isRootSelected state for all selected items
			items = updateRootSelectedState(items);

			// Create path index for selected diagrams for efficient access
			const selectedDiagramPathIndex = createSelectedDiagramPathIndex(items);

			return {
				...prevState,
				items,
				multiSelectGroup,
				selectedDiagramPathIndex,
			};
		});
	}, []);
};
