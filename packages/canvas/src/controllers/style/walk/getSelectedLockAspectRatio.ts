import { readSelectionStyle } from "./readSelectionStyle";
import type { StyleIntentRegistries } from "./StyleIntentRegistries";
import { DEFAULT_LOCK_ASPECT_RATIO } from "../../../states/objects/base/TransformState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { selectionValueOrFirst } from "../SelectionValue";
import type { SelectionValue } from "../SelectionValue";

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
): boolean =>
	resolveSelectedLockAspectRatio(state.multiSelectGroup, () =>
		readSelectionStyle(state, "lockAspectRatio", registries),
	);

/**
 * {@link getSelectedLockAspectRatio} with the members' side handed in, for a
 * caller already holding a reader bound to the selection (the sidebar's row).
 *
 * @param multiSelectGroup - The state's `multiSelectGroup`; when non-null its own flag is the answer and `readMembersLock` is not called
 * @param readMembersLock - What the selection reads for the `lockAspectRatio` intent, as `readSelectionStyle` reports it
 * @returns Whether the selection is locked; {@link DEFAULT_LOCK_ASPECT_RATIO} when neither side carries the flag
 */
export const resolveSelectedLockAspectRatio = (
	multiSelectGroup: CanvasControllerState["multiSelectGroup"],
	readMembersLock: () => SelectionValue<boolean>,
): boolean => {
	if (multiSelectGroup !== null) {
		return multiSelectGroup.lockAspectRatio ?? DEFAULT_LOCK_ASPECT_RATIO;
	}
	return selectionValueOrFirst(readMembersLock(), DEFAULT_LOCK_ASPECT_RATIO);
};
