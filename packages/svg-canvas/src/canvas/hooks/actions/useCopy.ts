import { useCallback, useRef } from "react";

import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectLineState } from "../../../types/state/shapes/ConnectLineState";
import { getSelectedDiagrams } from "../../../utils/core/getSelectedDiagrams";
import { isItemableState } from "../../../utils/validation/isItemableState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";

/**
 * Collects all shape IDs contained in the specified list
 * (including shapes within groups)
 *
 * @param items - List of shapes
 * @param idSet - Set to collect IDs
 */
const collectAllShapeIds = (items: Diagram[], idSet: Set<string>) => {
	for (const item of items) {
		idSet.add(item.id);

		// Process children recursively if they exist
		if (isItemableState(item) && item.items) {
			collectAllShapeIds(item.items, idSet);
		}
	}
};

/**
 * Gets connection lines where both ends are selected shapes
 *
 * @param allItems - All items on canvas
 * @param selectedIds - Set of selected shape IDs
 * @returns List of connection lines with both ends selected
 */
const findConnectLinesWithBothEndsSelected = (
	allItems: Diagram[],
	selectedIds: Set<string>,
): ConnectLineState[] => {
	return allItems
		.filter((item) => item.type === "ConnectLine")
		.map((item) => item as ConnectLineState)
		.filter(
			(connectLine) =>
				selectedIds.has(connectLine.startOwnerId) &&
				selectedIds.has(connectLine.endOwnerId),
		);
};

/**
 * Custom hook to handle copy events on the canvas.
 */
export const useCopy = (props: SvgCanvasSubHooksProps) => {
	// Create references bypass to avoid function creation in every render
	const refBusVal = {
		props,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback(() => {
		// Bypass references to avoid function creation in every render
		const {
			canvasState: { items },
		} = refBus.current.props;

		// Get selected items from the main items array
		const selectedItems = getSelectedDiagrams(items);

		// If no items are selected, do nothing
		if (selectedItems.length === 0) return;

		try {
			// Collect IDs of selected shapes
			const selectedIds = new Set<string>();
			collectAllShapeIds(selectedItems, selectedIds);

			// Get connection lines where both ends are selected
			const connectLines = findConnectLinesWithBothEndsSelected(
				items,
				selectedIds,
			);

			// Add connection lines to copy targets
			const itemsToCopy = [...selectedItems, ...connectLines];

			const clipboardData = JSON.stringify(itemsToCopy);

			// Copy the data to the clipboard
			navigator.clipboard
				.writeText(clipboardData)
				.then(() => {
					console.log("Selected items copied to clipboard.");
				})
				.catch((err) => {
					console.error("Could not copy items to clipboard: ", err);
				});
		} catch (error) {
			console.error("Error while copying selected items to clipboard: ", error);
		}
	}, []);
};
