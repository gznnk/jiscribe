import { useCallback, useRef } from "react";

import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectLineState } from "../../../types/state/shapes/ConnectLineState";
import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";
import type { GroupState } from "../../../types/state/shapes/GroupState";
import { getDiagramById } from "../../../utils/core/getDiagramById";
import { newId } from "../../../utils/shapes/common/newId";
import { isConnectableState } from "../../../utils/validation/isConnectableState";
import { isItemableState } from "../../../utils/validation/isItemableState";
import { isSelectableState } from "../../../utils/validation/isSelectableState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { clearSelectionRecursively } from "../../utils/clearSelectionRecursively";
import { createMultiSelectGroup } from "../../utils/createMultiSelectGroup";
import { createSelectedDiagramPathIndex } from "../../utils/createSelectedDiagramPathIndex";
import { updateRootSelectedState } from "../../utils/updateRootSelectedState";

/**
 * Offset amount when pasting shapes
 */
const PASTE_OFFSET = 20;

/**
 * Calculates new coordinate with offset when pasting shapes
 *
 * @param x - Original coordinate
 * @returns Coordinate with applied offset
 */
const applyOffset = (x: number): number => {
	return x + PASTE_OFFSET;
};

/**
 * Type for mapping between old and new IDs
 */
type IdMap = { [oldId: string]: string };

/**
 * Applies offset to a diagram item's coordinates
 *
 * @param item - The diagram item to move
 * @returns The diagram item with updated coordinates
 */
const applyOffsetToItem = (item: Diagram): Diagram => {
	const newItem = { ...item };

	// Apply offset to items with coordinates
	if ("x" in newItem && "y" in newItem) {
		newItem.x = applyOffset(newItem.x as number);
		newItem.y = applyOffset(newItem.y as number);
	}

	// Also apply offset to connection points if present
	if (isConnectableState(newItem) && newItem.connectPoints) {
		newItem.connectPoints = newItem.connectPoints.map((connectPoint) => ({
			...connectPoint,
			x: applyOffset(connectPoint.x),
			y: applyOffset(connectPoint.y),
		})) as ConnectPointState[];
	}

	return newItem;
};

/**
 * Sets the selection state for diagram items
 *
 * @param item - Target diagram item
 * @param isTopLevel - Whether this item is at the top level
 * @param isMultiSelect - Whether multiple selection mode is active
 * @returns Diagram item with updated selection state
 */
const setSelectionState = (
	item: Diagram,
	isTopLevel: boolean,
	isMultiSelect: boolean,
): Diagram => {
	const newItem = { ...item };

	if (isSelectableState(newItem)) {
		if (isMultiSelect) {
			// For multiple selection mode
			if (isTopLevel) {
				// Only set isSelected to true for top-level items
				// This ensures only top-level groups are selected in multi-select mode
				newItem.isSelected = true;
			} else {
				// Child elements are not selected
				newItem.isSelected = false;
			}
		} else {
			// For single selection mode
			// Only set isSelected to true if it's a top-level item
			newItem.isSelected = isTopLevel;
		}
	}

	return newItem;
};

/**
 * Assigns new IDs to diagram items and connection points
 *
 * @param item - Target diagram item
 * @param idMap - Mapping between old and new IDs (optional)
 * @returns Diagram item with new IDs assigned
 */
const assignNewIds = (item: Diagram, idMap?: IdMap): Diagram => {
	const newItemId = newId();

	// Record the ID mapping
	if (idMap) {
		idMap[item.id] = newItemId;
	}

	const newItem = {
		...item,
		id: newItemId,
	};

	// Assign new IDs to connection points if present
	if (isConnectableState(newItem) && newItem.connectPoints) {
		newItem.connectPoints = newItem.connectPoints.map((connectPoint) => {
			const connectPointNewId = newId();

			// Add connection point ID to mapping
			if (idMap) {
				idMap[connectPoint.id] = connectPointNewId;
			}

			return {
				...connectPoint,
				id: connectPointNewId,
			};
		}) as ConnectPointState[];
	}

	return newItem;
};

/**
 * Recursively processes diagram items and their children
 * Applies the following operations:
 * - Assigns new IDs
 * - Applies position offset
 * - Sets selection states
 *
 * @param item - Diagram item to process
 * @param isTopLevel - Whether this item is at the top level
 * @param isMultiSelect - Whether multiple selection mode is active
 * @param idMap - Mapping between old and new IDs (optional)
 * @returns Processed diagram item
 */
const processDiagramForPasteRecursively = (
	item: Diagram,
	isTopLevel: boolean,
	isMultiSelect: boolean,
	idMap?: IdMap,
): Diagram => {
	// Apply each operation in sequence
	let newItem = assignNewIds(item, idMap);
	newItem = applyOffsetToItem(newItem);
	newItem = setSelectionState(newItem, isTopLevel, isMultiSelect);

	// For groups and other container items, recursively process children
	if (isItemableState(newItem)) {
		newItem.items = newItem.items.map((childItem) =>
			// Child items are never top level
			processDiagramForPasteRecursively(childItem, false, isMultiSelect, idMap),
		);
	}

	return newItem;
};

/**
 * Processes connection lines for pasting
 * Updates source and target connection IDs and applies offset to path points
 *
 * @param connectLine - Connection line to be pasted
 * @param idMap - Mapping between old and new IDs
 * @param items - All diagram items after pasting
 * @returns Updated connection line or null if invalid connections
 */
const processConnectLineForPaste = (
	connectLine: ConnectLineState,
	idMap: IdMap,
	items: Diagram[],
): ConnectLineState | null => {
	// Check if both connection endpoints are included in pasted items
	const newStartOwnerId = idMap[connectLine.startOwnerId];
	const newEndOwnerId = idMap[connectLine.endOwnerId];

	// Return null if either endpoint is missing
	if (!newStartOwnerId || !newEndOwnerId) {
		return null;
	}

	// Get the new connection target shapes
	const startOwner = getDiagramById(items, newStartOwnerId);
	const endOwner = getDiagramById(items, newEndOwnerId);

	// Return null if either shape is not found
	if (!startOwner || !endOwner) {
		return null;
	}

	// Generate new ID for the connection line
	const newConnectLineId = newId();

	// Create new connection line object
	const newConnectLine: ConnectLineState = {
		...connectLine,
		id: newConnectLineId,
		x: applyOffset(connectLine.x),
		y: applyOffset(connectLine.y),
		startOwnerId: newStartOwnerId,
		endOwnerId: newEndOwnerId,
		isSelected: false, // Pasted connection lines are not selected
		showOutline: false, // Hide outline for pasted connection lines
		// Update path points (simply apply offset)
		items: connectLine.items.map((point, index) => {
			// Assign new IDs
			let pointId: string;
			if (index === 0 || index === connectLine.items.length - 1) {
				// For endpoint points, use ID mapping if available
				pointId = idMap[point.id] || newId();
			} else {
				pointId = newId();
			}

			return {
				...point,
				id: pointId,
				x: applyOffset(point.x),
				y: applyOffset(point.y),
			};
		}),
	};

	return newConnectLine;
};

/**
 * Custom hook for handling paste operations on the canvas.
 * Processes clipboard data by performing the following operations:
 * - Assigns new IDs to pasted items
 * - Applies position offset to avoid exact overlap
 * - Sets appropriate selection states
 * - Reconnects connection lines
 * - Groups multiple items when needed
 *
 * @param props - Canvas hook properties containing setCanvasState and other context
 * @returns A callback function that executes the paste operation
 */
export const usePaste = (props: SvgCanvasSubHooksProps) => {
	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback(() => {
		// Bypass references to avoid function creation in every render.
		const { setCanvasState } = refBus.current.props;

		// Read data from clipboard
		navigator.clipboard
			.readText()
			.then((clipboardText) => {
				try {
					// Parse the clipboard data
					const newItems = JSON.parse(clipboardText) as Diagram[];

					if (!Array.isArray(newItems) || newItems.length === 0) {
						console.error("Invalid clipboard data format");
						return;
					}

					// Separate connection lines from normal shapes
					const connectLines = newItems.filter(
						(item) => item.type === "ConnectLine",
					) as ConnectLineState[];
					const normalItems = newItems.filter(
						(item) => item.type !== "ConnectLine",
					);

					// Determine if multi-select mode is active (excluding connection lines)
					const isMultiSelect = normalItems.length > 1;

					// Store mapping between old IDs and new IDs
					const idMap: IdMap = {};

					// Assign new IDs to the pasted items and slightly offset their position
					const pastedNormalItems = normalItems.map((item) => {
						// Recursively assign IDs and specify that the item is top-level
						// Also slightly offset the coordinates
						return processDiagramForPasteRecursively(
							item,
							true,
							isMultiSelect,
							idMap,
						);
					});

					// Update the canvas state with the pasted items
					setCanvasState((prevState) => {
						// Deselect all existing items
						const updatedItems = clearSelectionRecursively(prevState.items);

						// Add all pasted items
						let allItems = [...updatedItems, ...pastedNormalItems];

						// Process connection lines for pasting
						if (connectLines.length > 0) {
							// Process connection lines (update source and target, recalculate coordinates)
							const pastedConnectLines = connectLines
								.map((connectLine) =>
									processConnectLineForPaste(connectLine, idMap, [
										...updatedItems,
										...pastedNormalItems,
									]),
								)
								.filter((line): line is ConnectLineState => line !== null);

							// Add processed connection lines
							allItems = [...allItems, ...pastedConnectLines];
						}

						// Set multiSelectGroup for multi-select mode
						let multiSelectGroup: GroupState | undefined = undefined;
						if (isMultiSelect) {
							// Create multi-select group using the utility function
							multiSelectGroup = createMultiSelectGroup(
								pastedNormalItems,
								prevState.multiSelectGroup?.keepProportion,
							);

							// Hide transform controls for all items in multi-select mode
							allItems = allItems.map((item) => {
								if (isSelectableState(item) && item.isSelected) {
									return {
										...item,
										showOutline: true,
									};
								}
								return item;
							});
						}

						// Update isRootSelected state for all selected items
						allItems = updateRootSelectedState(allItems);

						// Create path index for selected diagrams
						const selectedDiagramPathIndex =
							createSelectedDiagramPathIndex(allItems);

						// Add the pasted items to the canvas
						return {
							...prevState,
							items: allItems,
							multiSelectGroup,
							selectedDiagramPathIndex,
						};
					});
				} catch (error) {
					console.error("Error while pasting items from clipboard:", error);
				}
			})
			.catch((err) => {
				console.error("Failed to read clipboard contents:", err);
			});
	}, []);
};
