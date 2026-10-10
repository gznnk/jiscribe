import { readSelectionStyle } from "./readSelectionStyle";
import { selectionValueOrFirst } from "./SelectionValue";
import type { StyleIntentRegistries } from "./StyleIntentRegistries";
import { DEFAULT_LOCK_ASPECT_RATIO } from "../../states/objects/base/TransformState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Whether a resize of the current selection keeps its proportions.
 *
 * The one place the precedence between the two locks is stated: a
 * multi-selection locks the transient box drawn around it
 * (`createMultiSelectGroup`), so that box's own flag is the answer and the
 * members have no say. Otherwise the selected objects answer through the style
 * intent, a selection disagreeing taking the first of their values — so one
 * press brings the whole selection onto the other one. Both the row that reports
 * the lock (the Layout section) and the command that flips it
 * (ToggleLockAspectRatioCommand) read it here, so they cannot disagree.
 *
 * @param state - The canvas state; its `multiSelectGroup` and selection decide who answers
 * @param registries - The canvas's style tables and the defaults their entries resolve through
 * @returns Whether the selection is locked; {@link DEFAULT_LOCK_ASPECT_RATIO} when neither the box nor anything the selection reaches carries the flag
 */
export const getSelectedLockAspectRatio = (
	state: CanvasControllerState,
	registries: StyleIntentRegistries,
): boolean => {
	if (state.multiSelectGroup !== null) {
		return state.multiSelectGroup.lockAspectRatio ?? DEFAULT_LOCK_ASPECT_RATIO;
	}
	return selectionValueOrFirst(
		readSelectionStyle(state, "lockAspectRatio", registries),
		DEFAULT_LOCK_ASPECT_RATIO,
	);
};
