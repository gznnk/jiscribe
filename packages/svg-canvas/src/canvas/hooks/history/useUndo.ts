import { useCallback, useRef } from "react";

import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { canvasStateToData } from "../../utils/canvasStateToData";
import { diagramDataListToDiagramList } from "../../utils/diagramDataListToDiagramList";

/**
 * Custom hook to handle undo events on the canvas.
 */
export const useUndo = (props: SvgCanvasSubHooksProps) => {
	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback(() => {
		// Bypass references to avoid function creation in every render.
		const { setCanvasState, onDataChange } = refBus.current.props;

		setCanvasState((prevState) => {
			// Get the previous state.
			const prevIndex = prevState.historyIndex - 1;
			if (prevIndex < 0) {
				// If there is no history, do nothing.
				return prevState;
			}
			const prevHistory = prevState.history[prevIndex];

			const ret = {
				...prevState,
				...prevHistory, // Overwrite the current state with the previous history.
				historyIndex: prevIndex,
			};

			// Convert items to proper state format with selection cleared
			ret.items = diagramDataListToDiagramList(prevHistory.items);

			// Notify the data change directly (no new history entry needed for undo).
			onDataChange?.(canvasStateToData(ret));

			return ret;
		});
	}, []);
};
