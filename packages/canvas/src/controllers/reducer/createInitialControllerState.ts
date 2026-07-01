import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { canvasToDoc, canvasToState } from "../../states/canvas/CanvasMapper";
import type { CanvasControllerState } from "../CanvasTypes";

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
		selectedIds: [],
		eventStartSnapshot: null,
		keyPointsCache: {},
		snapCandidatesCache: null,
		edgeScrollEnabled: false,
		commitVersion: 0,
		saveVersion: 0,
		saveNonce: "",
		historyCoalesce: { recorded: null, pending: null },
		contextMenuPosition: null,
		shapeLibraryDrag: null,
		areaSelection: null,
		objectMenuOpenId: null,
		multiSelectGroup: null,
		textEditState: null,
		pendingConnector: null,
		selectedConnectorId: null,
		selectedVertex: null,
		editingConnectorId: null,
		editingEndpoint: null,
		snapFeedback: null,
		axisLockFeedback: null,
		shapeDrawing: null,
		lastDuplicate: null,
		internalClipboard: null,
		history: {
			past: [],
			present: canvasToDoc(baseState),
			future: [],
		},
	};
};
