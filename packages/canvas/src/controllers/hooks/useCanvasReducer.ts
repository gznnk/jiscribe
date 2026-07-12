import { type Dispatch, useMemo, useReducer } from "react";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { DocCreationDefaults } from "../../schemas/objects/types/DocCreationDefaults";
import type { Camera } from "../../states/canvas/Viewport";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import { createCanvasReducer } from "../reducer/canvasReducer";
import { createInitialControllerState } from "../reducer/createInitialControllerState";
import type { CanvasRegistries } from "../setup/CanvasRegistries";

/**
 * Custom hook that sets up the canvas state-management reducer, including
 * construction of the initial state.
 *
 * @param canvasDoc - The CanvasDoc used to build the initial state (only read at mount time)
 * @param registries - The per-canvas registry bundle. Closed over by the reducer
 *   (via `createCanvasReducer`) and used to build the initial state.
 * @param docDefaults - Theme-derived creation defaults (only read at mount time;
 *   later changes are folded in via the SET_DOC_DEFAULTS action)
 * @param initialCamera - Seeds the initial viewport so the first paint lands at
 *   the host's pan/zoom instead of flashing the default (only read at mount time;
 *   later changes flow through the `viewport` prop / useControlledViewport).
 */
export const useCanvasReducer = (
	canvasDoc: CanvasDoc,
	registries: CanvasRegistries,
	docDefaults?: DocCreationDefaults,
	initialCamera?: Camera,
): [CanvasControllerState, Dispatch<CanvasAction>] => {
	const reducer = useMemo(() => createCanvasReducer(registries), [registries]);
	return useReducer(reducer, undefined, () =>
		createInitialControllerState(
			canvasDoc,
			registries,
			docDefaults,
			initialCamera,
		),
	);
};
