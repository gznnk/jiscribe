import { useCallback, useRef } from "react";

import type { Diagram } from "../../../types/state/core/Diagram";
import { isItemableState } from "../../../utils/validation/isItemableState";
import { isSelectableState } from "../../../utils/validation/isSelectableState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { applyFunctionRecursively } from "../../utils/applyFunctionRecursively";
import { createMultiSelectGroup } from "../../utils/createMultiSelectGroup";
import { createSelectedDiagramPathIndex } from "../../utils/createSelectedDiagramPathIndex";
import { updateRootSelectedState } from "../../utils/updateRootSelectedState";

/**
 * Custom hook to handle select all events on the canvas.
 */
export const useSelectAll = (props: SvgCanvasSubHooksProps) => {
	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback(() => {
		// Bypass references to avoid function creation in every render.
		const { setCanvasState } = refBus.current.props;

		setCanvasState((prevState) => {
			let items = prevState.items.map((item) => {
				if (!isSelectableState(item)) {
					// Ignore non-selectable items.
					return item;
				}
				if (item.type === "ConnectLine") {
					return {
						...item,
						isSelected: false, // Deselect ConnectLine items.
					};
				}

				if (isItemableState(item)) {
					return {
						...item,
						items: applyFunctionRecursively(item.items, (childItem) => {
							if (!isSelectableState(childItem)) {
								// Ignore non-selectable child items.
								return childItem;
							}
							return {
								...childItem,
								isAncestorSelected: true,
								showOutline: true,
							};
						}),
						isSelected: true,
						showOutline: true,
					};
				}

				return {
					...item,
					isSelected: true,
					showOutline: true,
				};
			});

			// Update isRootSelected state for all selected items
			items = updateRootSelectedState(items);

			// Create a multi-select group's items.
			const multiSelectGroupItems = items.filter(
				(item) => item.type !== "ConnectLine",
			) as Diagram[]; // Filter out ConnectLine items.
			if (multiSelectGroupItems.length < 2) {
				// If there are less than 2 items, do not create a multi-select group.
				return prevState;
			}

			// Create path index for selected diagrams
			const selectedDiagramPathIndex = createSelectedDiagramPathIndex(items);

			return {
				...prevState,
				items,
				multiSelectGroup: createMultiSelectGroup(
					multiSelectGroupItems,
					prevState.multiSelectGroup?.keepProportion ?? true,
				),
				selectedDiagramPathIndex,
			};
		});
	}, []);
};
