import type { CanvasControllerState } from "../../CanvasTypes";
import { NORMAL_MODE } from "../../utils/normalMode";
import { EMPTY_SELECTION } from "../CanvasSelection";

/**
 * Whether a full clear would change anything. Shared by the two commands that
 * clear (DeselectAll and EscapeSelection) so their availability cannot drift
 * from {@link clearAllSelection}'s field list.
 *
 * A part selection is not asked about separately: it only resolves while its
 * object is the sole selection, which `selection.objectIds` already covers.
 *
 * @param state - The current canvas controller state
 * @returns True when something is selected or open. A drag under way is not
 *   asked about: handleCommand refuses both commands for its length
 */
export const isSelectionClearable = (state: CanvasControllerState): boolean =>
	state.selection.objectIds.length > 0 ||
	state.mode.kind === "draw" ||
	state.stencilFlyout !== null;

/**
 * Drops the selection, along with the transient UI that hangs off one, an armed
 * drawing tool included.
 *
 * @param state - The current canvas controller state
 * @returns A new state with the selection fields cleared; every other field is
 *   carried over untouched. An open text edit's `mode` is left for
 *   reconcileSelection, which closes it once the selection it hangs off is gone
 */
export const clearAllSelection = (
	state: CanvasControllerState,
): CanvasControllerState => ({
	...state,
	selection: EMPTY_SELECTION,
	multiSelectGroup: null,
	objectMenuOpenId: null,
	stencilFlyout: null,
	mode: state.mode.kind === "draw" ? NORMAL_MODE : state.mode,
});
