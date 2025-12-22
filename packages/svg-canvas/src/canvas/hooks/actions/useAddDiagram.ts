import { useCallback, useRef } from "react";

import type { AddDiagramEvent } from "../../../types/events/AddDiagramEvent";
import { isSelectableState } from "../../../utils/validation/isSelectableState";
import type { SvgCanvasState } from "../../types/SvgCanvasState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { clearSelectionRecursively } from "../../utils/clearSelectionRecursively";
import { createSelectedDiagramPathIndex } from "../../utils/createSelectedDiagramPathIndex";
import { updateRootSelectedState } from "../../utils/updateRootSelectedState";
import { useAddHistory } from "../history/useAddHistory";

/**
 * Custom hook to handle new diagram events on the canvas.
 */
export const useAddDiagram = (props: SvgCanvasSubHooksProps) => {
	// Get the data change handler.
	const addHistory = useAddHistory(props);

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
		addHistory,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback((e: AddDiagramEvent) => {
		// Bypass references to avoid function creation in every render.
		const {
			props: { setCanvasState },
			addHistory,
		} = refBus.current;

		// Call the function to add a new item to the canvas.
		setCanvasState((prevState) => {
			let newItems = prevState.items;
			if (isSelectableState(e.item) && e.item.isSelected) {
				newItems = clearSelectionRecursively(prevState.items);
			}

			// Add the new item
			newItems = [...newItems, e.item];

			// Update isRootSelected state for all selected items
			newItems = updateRootSelectedState(newItems);

			// Create path index for selected diagrams
			const selectedDiagramPathIndex = createSelectedDiagramPathIndex(newItems);

			let newState = {
				...prevState,
				items: newItems,
				selectedDiagramPathIndex,
			} as SvgCanvasState;

			// Add history
			newState = addHistory(e.eventId, newState);

			return newState;
		});
	}, []);
};
