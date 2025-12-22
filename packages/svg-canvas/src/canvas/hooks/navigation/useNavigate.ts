import { useCallback, useRef } from "react";

import { InteractionState } from "../../types/InteractionState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";

/**
 * Custom hook to handle navigation events.
 * This provides a way to programmatically navigate to specific coordinates on the canvas.
 */
export const useNavigate = (props: SvgCanvasSubHooksProps) => {
	const { setCanvasState, onPanZoomChange } = props;

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		setCanvasState,
		onPanZoomChange,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback((minX: number, minY: number) => {
		// Bypass references to avoid function creation in every render.
		const { setCanvasState, onPanZoomChange } = refBus.current;

		setCanvasState((prevState) => {
			// Only update state directly if interaction state is Idle
			if (prevState.interactionState === InteractionState.Idle) {
				onPanZoomChange?.({
					minX,
					minY,
					zoom: prevState.zoom,
				});

				return {
					...prevState,
					minX,
					minY,
				};
			}
			return prevState;
		});
	}, []);
};
