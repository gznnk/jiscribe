import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Transient UI/interaction fields of CanvasControllerState.
 *
 * These are cleared as a set whenever the underlying object set is swapped out
 * (undo/redo, external sync) or the canvas is initialized. They are not part of
 * CanvasDoc and carry no history.
 *
 * Kept as a `Pick` so the field list stays type-locked to CanvasControllerState:
 * renaming a field there fails to compile here.
 */
export type UiStateReset = Pick<
	CanvasControllerState,
	| "selectedIds"
	| "eventStartSnapshot"
	| "keyPointsCache"
	| "snapCandidatesCache"
	| "edgeScrollEnabled"
	| "contextMenuPosition"
	| "shapeLibraryDrag"
	| "areaSelection"
	| "objectMenuOpenId"
	| "multiSelectGroup"
	| "textEditState"
	| "pendingConnector"
	| "selectedConnectorId"
	| "selectedVertex"
	| "editingConnectorId"
	| "editingEndpoint"
	| "snapFeedback"
	| "axisLockFeedback"
	| "shapeDrawing"
	| "lastDuplicate"
>;

/**
 * Returns the reset values for every transient UI/interaction field.
 *
 * Single source of truth for the "clear all UI state" list previously duplicated
 * across undo/redo, external sync, and initialization. Spread over a state to
 * clear them all at once: `{ ...state, ...resetUiState() }`.
 *
 * Returns a fresh object (with fresh `selectedIds` / `keyPointsCache`) on every
 * call so no mutable reference is shared between states.
 */
export const resetUiState = (): UiStateReset => ({
	selectedIds: [],
	eventStartSnapshot: null,
	keyPointsCache: {},
	snapCandidatesCache: null,
	edgeScrollEnabled: false,
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
});
