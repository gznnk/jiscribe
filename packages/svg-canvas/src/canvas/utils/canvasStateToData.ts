import { convertItemsStateToData } from "../../utils/core/convertItemsStateToData";
import type { SvgCanvasData } from "../types/SvgCanvasData";
import type { SvgCanvasState } from "../types/SvgCanvasState";

/**
 * Conversion function from SvgCanvasState to SvgCanvasData.
 * Extracts only the necessary properties included in SvgCanvasData.
 *
 * @param state - Source SvgCanvasState
 * @returns SvgCanvasData object
 */
export const canvasStateToData = (state: SvgCanvasState): SvgCanvasData => {
	return {
		id: state.id,
		minX: state.minX,
		minY: state.minY,
		zoom: state.zoom,
		items: convertItemsStateToData(state.items),
	};
};
