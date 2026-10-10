import type { CanvasControllerState } from "../../../CanvasTypes";
import { isTextSlotPart } from "../../../selection/partKinds/textSlotPartKind";

/**
 * Whether the chrome (the ObjectMenu, the properties sidebar) takes text as its
 * subject: a shape's text is being edited, or a text slot is picked one level
 * below the object. Anything else — a plain object selection, a picked vertex —
 * leaves it addressing the object as a whole.
 *
 * @param state - The current canvas controller state; the open text edit and the
 *   picked part are read, the latter as it stands (the reducer has already
 *   dropped a stale one, reconcileSelection)
 * @returns True while either holds; false while nothing is selected
 */
export const isTextAddressed = (state: CanvasControllerState): boolean =>
	state.textEditState?.kind === "shape" || isTextSlotPart(state.selection.part);
