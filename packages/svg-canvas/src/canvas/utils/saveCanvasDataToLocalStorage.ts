import { clearSelectionRecursively } from "./clearSelectionRecursively";
import type { SvgCanvasState } from "../types/SvgCanvasState";

/**
 * Save the current canvas state to local storage.
 *
 * @param canvasState - The state of the canvas to save.
 */
export const saveCanvasDataToLocalStorage = (
	canvasState: SvgCanvasState,
): void => {
	// Save the canvas state to local storage
	const canvasData = {
		...canvasState,
		items: clearSelectionRecursively(canvasState.items), // Clear selected items before saving
		multiSelectGroup: undefined, // Exclude multiSelectGroup from local storage
		history: undefined, // Exclude history from local storage
		historyIndex: undefined, // Exclude history index from local storage
		lastHistoryEventId: undefined, // Exclude last history event ID from local storage
	};
	localStorage.setItem(
		`canvasData_${canvasData.id}`,
		JSON.stringify(canvasData),
	);
};
