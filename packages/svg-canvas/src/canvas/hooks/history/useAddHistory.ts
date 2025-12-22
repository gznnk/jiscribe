import { useCallback, useRef } from "react";

import { MAX_HISTORY_SIZE } from "../../SvgCanvasConstants";
import type { SvgCanvasHistory } from "../../types/SvgCanvasHistory";
import type { SvgCanvasState } from "../../types/SvgCanvasState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { canvasStateToData } from "../../utils/canvasStateToData";
import { canvasStateToHistory } from "../../utils/canvasStateToHistory";

/**
 * Custom hook to add history entries to the canvas.
 * @param props - The sub hooks properties containing the onDataChange callback.
 * @returns A callback function to add history entries and return a new canvas state.
 */
export const useAddHistory = (props: SvgCanvasSubHooksProps) => {
	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		onDataChange: props.onDataChange,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback(
		(eventId: string, canvasState: SvgCanvasState): SvgCanvasState => {
			// Bypass references to avoid function creation in every render.
			const { onDataChange } = refBus.current;

			let newHistory: SvgCanvasHistory[];

			// When the last history event ID is the same as the new state, overwrite the history.
			if (canvasState.lastHistoryEventId === eventId) {
				// Overwrite the last history with the new state.
				newHistory = canvasState.history.slice(0, canvasState.historyIndex);
				newHistory.push(canvasStateToHistory(canvasState));
			} else {
				// Add a new history entry.
				newHistory = canvasState.history.slice(0, canvasState.historyIndex + 1);
				newHistory.push(canvasStateToHistory(canvasState));

				// Remove the oldest history if the size exceeds the maximum limit.
				if (MAX_HISTORY_SIZE < newHistory.length) {
					newHistory = newHistory.slice(1);
				}
			}

			// Create new canvas state with updated history properties
			const newCanvasState = {
				...canvasState,
				history: newHistory,
				lastHistoryEventId: eventId,
				historyIndex: newHistory.length - 1,
			};

			onDataChange?.(canvasStateToData(newCanvasState));

			return newCanvasState;
		},
		[],
	);
};
