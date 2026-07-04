import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { canvasToState } from "../../states/canvas/CanvasMapper";
import { createDocSnapshotFromDoc } from "../../states/canvas/DocSnapshot";
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
			// The original doc is kept verbatim (no round-trip through canvasToDoc),
			// so the initial present compares byte-for-byte against the host's doc.
			present: createDocSnapshotFromDoc(initialDoc),
			future: [],
		},
	};
};
