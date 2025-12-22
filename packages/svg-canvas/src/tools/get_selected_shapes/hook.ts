
import type { EventBus } from "@workspace/event-bus";
import type { FunctionCallHandler, FunctionCallInfo } from "@workspace/llm-client";
import { useCallback } from "react";

import { useSvgCanvasState } from "../../context/SvgCanvasStateContext";
import { convertItemsStateToData } from "../../utils/core/convertItemsStateToData";
import { getSelectedDiagrams } from "../../utils/core/getSelectedDiagrams";

/**
 * Hook that provides a function call handler for retrieving selected shapes from the canvas.
 * Converts selected shapes from State format to Data format recursively.
 *
 * @param _eventBus - Event bus instance (unused but required for handler signature)
 * @returns Function call handler that retrieves selected shapes
 */
export const useGetSelectedShapesTool = (
	_eventBus: EventBus,
): FunctionCallHandler => {
	const canvasStateRef = useSvgCanvasState();

	return useCallback(
		(_functionCall: FunctionCallInfo) => {
			const canvasState = canvasStateRef.current;
			if (!canvasState) {
				return { selectedShapes: [] };
			}

			// Get all selected diagrams from the canvas
			const selectedDiagrams = getSelectedDiagrams(canvasState.items);

			// Convert selected diagrams from State to Data format
			const selectedShapesData = convertItemsStateToData(selectedDiagrams);

			return { selectedShapes: selectedShapesData };
		},
		[canvasStateRef],
	);
};
