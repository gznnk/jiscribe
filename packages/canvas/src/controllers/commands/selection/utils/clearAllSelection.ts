import type { CanvasControllerState } from "../../../CanvasTypes";

/**
 * Whether a full clear would change anything. Shared by the two commands that
 * clear (DeselectAll and EscapeSelection) so their availability cannot drift
 * from {@link clearAllSelection}'s field list.
 *
 * A part selection is not asked about separately: it only resolves while its
 * object is the sole selection, which `selectedIds` already covers.
 *
 * @param state - The current canvas controller state
 * @returns True when something is selected or open; false during an object drag
 *   (any drag other than area selection), where clearing would strand the drag
 */
export const isSelectionClearable = (state: CanvasControllerState): boolean => {
	if (state.activeDrag !== null && state.areaSelection === null) {
		return false;
	}
	return (
		state.selectedIds.length > 0 ||
		state.areaSelection !== null ||
		state.shapeDrawing !== null ||
		state.stencilLibraryOpenCategory !== null
	);
};

/**
 * Drops the selection, along with the transient UI that hangs off one.
 *
 * @param state - The current canvas controller state
 * @returns A new state with the selection fields cleared; every other field is
 *   carried over untouched
 */
export const clearAllSelection = (
	state: CanvasControllerState,
): CanvasControllerState => ({
	...state,
	selectedIds: [],
	objectPartSelection: null,
	multiSelectGroup: null,
	areaSelection: null,
	objectMenuOpenId: null,
	stencilLibraryOpenCategory: null,
	edgeScrollEnabled: false,
	shapeDrawing: null,
});
