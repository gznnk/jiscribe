import { type Dispatch, useMemo, useReducer } from "react";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { Camera } from "../../states/canvas/Viewport";
import type { CanvasControllerState, ScrollBoundsConfig } from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import { createCanvasReducer } from "../reducer/canvasReducer";
import { createInitialControllerState } from "../reducer/createInitialControllerState";
import type { CanvasRegistries } from "../registries/CanvasRegistries";

/**
 * Custom hook that sets up the canvas state-management reducer, including
 * construction of the initial state.
 *
 * @param canvasDoc - The CanvasDoc used to build the initial state (only read at mount time)
 * @param registries - The per-canvas registry bundle. Closed over by the reducer
 *   (via `createCanvasReducer`) and used to build the initial state.
 * @param initialCamera - Seeds the initial viewport so the first paint lands at
 *   the host's pan/zoom instead of flashing the default (only read at mount time;
 *   later programmatic changes go through `ref.current.viewport.setViewport`).
 * @param scrollBoundsConfig - How far the view may be scrolled; omitted leaves
 *   the canvas infinite. Only read at mount time — it goes into the initial
 *   state, which is what `limitViewScroll` reads it from.
 */
export const useCanvasReducer = (
	canvasDoc: CanvasDoc,
	registries: CanvasRegistries,
	initialCamera?: Camera,
	scrollBoundsConfig?: ScrollBoundsConfig,
): [CanvasControllerState, Dispatch<CanvasAction>] => {
	const reducer = useMemo(() => createCanvasReducer(registries), [registries]);
	return useReducer(reducer, undefined, () =>
		createInitialControllerState(
			canvasDoc,
			registries,
			initialCamera,
			scrollBoundsConfig,
		),
	);
};
