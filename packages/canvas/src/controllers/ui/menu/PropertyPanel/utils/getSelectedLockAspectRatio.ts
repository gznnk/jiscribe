import { DEFAULT_LOCK_ASPECT_RATIO } from "../../../../../states/objects/base/TransformState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { StyleIntentRegistries } from "../../../../style/ObjectStyleRegistry";
import { readSelectionStyle } from "../../../../style/readSelectionStyle";
import { selectionValueOrFirst } from "../../../../style/SelectionValue";

/**
 * Whether the Layout section's lock row is lit for the current selection.
 *
 * A multi-selection locks the box drawn around it, so that box's own flag is the
 * answer and the members have no say — the same precedence the write follows
 * (ToggleLockAspectRatioCommand). Otherwise the selected objects answer through the
 * style intent, a selection disagreeing showing the first of their values the way
 * it showed the first selected object's before.
 *
 * @param state - The canvas state; its selection decides who is read
 * @param registries - The canvas's style tables and the defaults their entries resolve through
 * @returns Whether to draw the row as locked; {@link DEFAULT_LOCK_ASPECT_RATIO} when nothing in the selection carries the flag
 */
export const getSelectedLockAspectRatio = (
	state: CanvasControllerState,
	registries: StyleIntentRegistries,
): boolean => {
	if (state.multiSelectGroup) {
		return state.multiSelectGroup.lockAspectRatio ?? DEFAULT_LOCK_ASPECT_RATIO;
	}
	return selectionValueOrFirst(
		readSelectionStyle(state, "lockAspectRatio", registries),
		DEFAULT_LOCK_ASPECT_RATIO,
	);
};
