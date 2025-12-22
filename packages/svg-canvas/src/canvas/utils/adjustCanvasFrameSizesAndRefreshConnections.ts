import { adjustCanvasFrameSizes } from "./adjustCanvasFrameSizes";
import { applyFunctionRecursively } from "./applyFunctionRecursively";
import { replaceDiagram } from "./replaceDiagram";
import { updateDiagramConnectPoints } from "./updateDiagramConnectPoints";
import type { Diagram } from "../../types/state/core/Diagram";
import { refreshConnectLines } from "../../utils/shapes/connectLine/refreshConnectLines";
import { isConnectableState } from "../../utils/validation/isConnectableState";
import { isItemableState } from "../../utils/validation/isItemableState";
import type { SvgCanvasState } from "../types/SvgCanvasState";

/**
 * Adjusts canvas frame sizes and refreshes all connections.
 * This function performs the following operations:
 * 1. Adjusts all canvas frame sizes
 * 2. Updates connect points for all affected diagrams
 * 3. Refreshes connect lines for all connectable diagrams
 *
 * @param state - Current canvas state
 * @param previousState - Previous canvas state (for connect line refresh)
 * @returns Updated canvas state with adjusted sizes and refreshed connections
 */
export const adjustCanvasFrameSizesAndRefreshConnections = (
	state: SvgCanvasState,
	previousState?: SvgCanvasState,
): SvgCanvasState => {
	// Step 1: Adjust canvas frame sizes
	const adjustedItems = adjustCanvasFrameSizes(state.items);

	// Step 2: Collect all canvas frames that were adjusted and update their connect points
	const canvasFramesToUpdate: Diagram[] = [];
	applyFunctionRecursively(adjustedItems, (item) => {
		if (isItemableState(item) && item.itemableType === "canvas") {
			canvasFramesToUpdate.push(item);
		}
		return item;
	});

	// Update connect points for all adjusted canvas frames
	let itemsWithUpdatedConnectPoints = adjustedItems;
	for (const canvasFrame of canvasFramesToUpdate) {
		const updatedCanvasFrame = updateDiagramConnectPoints(canvasFrame);
		itemsWithUpdatedConnectPoints = replaceDiagram(
			itemsWithUpdatedConnectPoints,
			updatedCanvasFrame,
		);
	}

	// Step 3: Collect all connectable diagrams for connect line refresh
	const connectableDiagrams: Diagram[] = [];
	applyFunctionRecursively(itemsWithUpdatedConnectPoints, (item) => {
		if (isConnectableState(item)) {
			connectableDiagrams.push(item);
		}
		return item;
	});

	// Create new state with adjusted items
	let newState: SvgCanvasState = {
		...state,
		items: itemsWithUpdatedConnectPoints,
	};

	// Refresh connect lines for all connectable diagrams
	if (connectableDiagrams.length > 0) {
		newState = refreshConnectLines(
			connectableDiagrams,
			newState,
			previousState,
		);
	}

	return newState;
};
