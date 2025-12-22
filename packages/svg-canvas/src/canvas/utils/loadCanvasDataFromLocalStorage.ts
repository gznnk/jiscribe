import { canvasStateToHistory } from "./canvasStateToHistory";
import { newEventId } from "../../utils/core/newEventId";
import type { SvgCanvasState } from "../types/SvgCanvasState";

/**
 * Load canvas data from local storage.
 *
 * @param id - The ID of the canvas data to load. Defaults to "default".
 * @returns {SvgCanvasState | undefined} - The loaded canvas state, or undefined if not found.
 */
export const loadCanvasDataFromLocalStorage = (
	id = "default",
): SvgCanvasState | undefined => {
	// Load the canvas state from local storage
	const canvasData = localStorage.getItem(`canvasData_${id}`);
	if (canvasData) {
		const canvasState = JSON.parse(canvasData) as SvgCanvasState;
		// Create a new history entry for the loaded state
		const historyEntry = canvasStateToHistory(canvasState);
		const newHistory = [historyEntry];
		const historyIndex = 0; // Set the history index to the first entry
		const lastHistoryEventId = newEventId(); // Generate a new event ID for the loaded state
		return {
			...canvasState,
			history: newHistory,
			historyIndex,
			lastHistoryEventId,
		};
	}
	return undefined;
};
