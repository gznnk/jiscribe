import { useCallback, useRef } from "react";

import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";

/**
 * Custom hook to handle suppressContextMenu state.
 * Returns a function to update the suppressContextMenu flag.
 */
export const useSuppressContextMenu = (props: SvgCanvasSubHooksProps) => {
	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback((suppress: boolean) => {
		// Bypass references to avoid function creation in every render.
		const { setCanvasState } = refBus.current.props;

		setCanvasState((prevState) => ({
			...prevState,
			suppressContextMenu: suppress,
		}));
	}, []);
};
