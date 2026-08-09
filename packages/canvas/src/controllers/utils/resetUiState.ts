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
	| "activeDragKind"
	| "inertialScrolling"
	| "keyPointsCache"
	| "snapCandidatesCache"
	| "edgeScrollEnabled"
	| "contextMenuPosition"
	| "stencilLibraryDrag"
	| "areaSelection"
	| "objectMenuOpenId"
	| "stencilLibraryOpenCategory"
	| "multiSelectGroup"
	| "textEditState"
	| "pendingConnector"
	| "selectedConnectorId"
	| "selectedVertex"
	| "selectedTextSlot"
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
	// cancelPendingGesture() drops an in-flight drag without firing dragEnd, so this
	// reset is what keeps the kind from outliving the gesture on an external swap.
	activeDragKind: null,
	// Same reason as activeDragKind: cancelPendingGesture() may kill a glide during
	// the swap, and the flag must not outlive it.
	inertialScrolling: false,
	keyPointsCache: {},
	snapCandidatesCache: null,
	edgeScrollEnabled: false,
	contextMenuPosition: null,
	stencilLibraryDrag: null,
	areaSelection: null,
	objectMenuOpenId: null,
	stencilLibraryOpenCategory: null,
	multiSelectGroup: null,
	textEditState: null,
	pendingConnector: null,
	selectedConnectorId: null,
	selectedVertex: null,
	selectedTextSlot: null,
	editingConnectorId: null,
	editingEndpoint: null,
	snapFeedback: null,
	axisLockFeedback: null,
	shapeDrawing: null,
	lastDuplicate: null,
});
