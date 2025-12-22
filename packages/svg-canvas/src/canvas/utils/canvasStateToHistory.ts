import { convertItemsStateToData } from "../../utils/core/convertItemsStateToData";
import { deepCopy } from "../../utils/core/deepCopy";
import type { SvgCanvasHistory } from "../types/SvgCanvasHistory";
import type { SvgCanvasState } from "../types/SvgCanvasState";

/**
 * Convert the canvas state to history format.
 *
 * @param canvasState - The state of the canvas.
 * @returns {SvgCanvasHistory} - The history format of the canvas state.
 */
export const canvasStateToHistory = (
	canvasState: SvgCanvasState,
): SvgCanvasHistory => {
	// Convert the canvas state to history format
	const canvasHistory = {
		items: convertItemsStateToData(canvasState.items),
	};

	// Deep copy the canvas history to avoid mutating the original state
	return deepCopy(canvasHistory);
};
