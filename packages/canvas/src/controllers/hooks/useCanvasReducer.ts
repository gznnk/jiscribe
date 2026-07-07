import { type Dispatch, useReducer } from "react";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { DocCreationDefaults } from "../../schemas/objects/types/DocCreationDefaults";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import { canvasReducer } from "../reducer/canvasReducer";
import { createInitialControllerState } from "../reducer/createInitialControllerState";

/**
 * Custom hook that sets up the canvas state-management reducer, including
 * construction of the initial state.
 *
 * @param canvasDoc - The CanvasDoc used to build the initial state (only read at mount time)
 * @param docDefaults - Theme-derived creation defaults (only read at mount time;
 *   later changes are folded in via the SET_DOC_DEFAULTS action)
 */
export const useCanvasReducer = (
	canvasDoc: CanvasDoc,
	docDefaults?: DocCreationDefaults,
): [CanvasControllerState, Dispatch<CanvasAction>] => {
	return useReducer(canvasReducer, undefined, () =>
		createInitialControllerState(canvasDoc, docDefaults),
	);
};
