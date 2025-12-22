import { useCallback, useRef } from "react";

import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { canvasStateToData } from "../../utils/canvasStateToData";
import { diagramDataListToDiagramList } from "../../utils/diagramDataListToDiagramList";

/**
 * Custom hook to handle redo events on the canvas.
 */
export const useRedo = (props: SvgCanvasSubHooksProps) => {
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
			// Get the next state in the history.
			const nextIndex = prevState.historyIndex + 1;
			if (nextIndex >= prevState.history.length) {
				// If there is no next history, do nothing.
				return prevState;
			}
			const nextHistory = prevState.history[nextIndex];

			const ret = {
				...prevState,
				...nextHistory, // Overwrite the current state with the next history.
				historyIndex: nextIndex,
			};

			// Convert items to proper state format with selection cleared
			ret.items = diagramDataListToDiagramList(nextHistory.items);

			// Notify the data change directly (no new history entry needed for redo).
			onDataChange?.(canvasStateToData(ret));

			return ret;
		});
	}, []);
};
