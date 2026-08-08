import type { CanvasControllerState } from "../../../CanvasTypes";

/**
 * Whether a full clear would change anything. Shared by the two commands that
 * clear (DeselectAll and EscapeSelection) so their availability cannot drift
 * from {@link clearAllSelection}'s field list.
 *
 * A slot selection is not asked about separately: it only resolves while its
 * object is the sole selection, which `selectedIds` already covers.
 *
 * @param state - The current canvas controller state
 * @returns True when something is selected or open; false during an object drag
 *   (any drag other than area selection), where clearing would strand the drag
 */
export const isSelectionClearable = (state: CanvasControllerState): boolean => {
	if (state.eventStartSnapshot !== null && state.areaSelection === null) {
		return false;
	}
	return (
		state.selectedIds.length > 0 ||
		state.selectedConnectorId !== null ||
		state.selectedVertex !== null ||
		state.areaSelection !== null ||
		state.shapeDrawing !== null ||
		state.stencilLibraryOpenCategory !== null
	);
};

/**
 * Drops every selection channel at once, along with the transient UI that hangs
 * off a selection.
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
	selectedConnectorId: null,
	// Without clearing it, an invisible vertex selection lingers and the Delete key deletes an unintended vertex
	selectedVertex: null,
	selectedTextSlot: null,
	multiSelectGroup: null,
	areaSelection: null,
	objectMenuOpenId: null,
	stencilLibraryOpenCategory: null,
	edgeScrollEnabled: false,
	shapeDrawing: null,
});
