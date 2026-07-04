import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { canvasToDoc, canvasToState } from "../../states/canvas/CanvasMapper";
import type { CanvasControllerState } from "../CanvasTypes";
import { resetUiState } from "../utils/resetUiState";

/**
 * Builds the initial CanvasControllerState from a CanvasDoc.
 *
 * Both production (useCanvasReducer) and integration tests share this so the
 * default values of the initial state do not drift apart.
 */
export const createInitialControllerState = (
	initialDoc: CanvasDoc,
): CanvasControllerState => {
	const baseState = canvasToState(initialDoc);
	return {
		...baseState,
		...resetUiState(),
		commitVersion: 0,
		saveVersion: 0,
		saveNonce: "",
		historyCoalesce: { recorded: null, pending: null },
		internalClipboard: null,
		history: {
			past: [],
			present: canvasToDoc(baseState),
			future: [],
		},
	};
};
