import { useCallback, useRef } from "react";

import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { clearSelectionRecursively } from "../../utils/clearSelectionRecursively";

/**
 * Custom hook to handle clear all selection events on the canvas.
 */
export const useClearAllSelection = (props: SvgCanvasSubHooksProps) => {
	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback(() => {
		// Bypass references to avoid function creation in every render.
		const { setCanvasState } = refBus.current.props;

		setCanvasState((prevState) => ({
			...prevState,
			items: clearSelectionRecursively(prevState.items),
			multiSelectGroup: undefined,
			selectedDiagramPathIndex: new Map(),
		}));
	}, []);
};
