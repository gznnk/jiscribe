import type { CanvasControllerState } from "../CanvasTypes";
import { NORMAL_MODE } from "./normalMode";
import { EMPTY_SELECTION } from "../selection/CanvasSelection";

/**
 * Transient UI/interaction fields of CanvasControllerState.
 *
 * These are cleared as a set whenever the underlying object set is swapped out
 * (history navigation — see restoreHistorySnapshot, which then re-selects what
 * the restored objects still hold — and external sync) or the canvas is
 * initialized. They are not part of CanvasDoc and carry no history.
 *
 * The two sidebars (`stencilLibraryPanel` / `propertyPanel`) and the categories
 * pinned to the rail (`pinnedCategoryIds`) are deliberately absent: they are
 * persistent chrome that outlives the document shown between them. The stencil
 * flyout is not: it closes like the other menus.
 *
 * Kept as a `Pick` so the field list stays type-locked to CanvasControllerState:
 * renaming a field there fails to compile here.
 */
export type UiStateReset = Pick<
	CanvasControllerState,
	| "selection"
	| "mode"
	| "drag"
	| "inertialScrolling"
	| "dragStartCaches"
	| "contextMenuPosition"
	| "objectMenuOpenId"
	| "stencilFlyout"
	| "multiSelectGroup"
	| "lastDuplicate"
>;

/**
 * Returns the reset values for every transient UI/interaction field.
 *
 * Single source of truth for the "clear all UI state" list previously duplicated
 * across history navigation, external sync, and initialization. Spread over a
 * state to clear them all at once: `{ ...state, ...resetUiState() }`.
 *
 * Returns a fresh object (with a fresh `dragStartCaches`) on every call so no
 * mutable reference is shared between states.
 */
export const resetUiState = (): UiStateReset => ({
	selection: EMPTY_SELECTION,
	// Both an open text edit and an armed drawing tool go with the document.
	mode: NORMAL_MODE,
	// cancelPendingGesture() drops an in-flight drag without firing dragEnd, so this
	// reset is what keeps the drag from outliving the gesture on an external swap.
	drag: null,
	// Same reason as drag: cancelPendingGesture() may kill a fling during
	// the swap, and the flag must not outlive it.
	inertialScrolling: false,
	dragStartCaches: { keyPoints: {}, snapCandidates: null },
	contextMenuPosition: null,
	objectMenuOpenId: null,
	stencilFlyout: null,
	multiSelectGroup: null,
	lastDuplicate: null,
});
