import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";

/**
 * Gets the lockAspectRatio value of the selected object(s).
 * For a multi-selection the multiSelectGroup value takes precedence; for a single
 * selection the selected object's value is returned. Defaults to false when neither has one.
 */
export const getSelectedLockAspectRatio = (
	state: CanvasControllerState,
): boolean => {
	// For a multi-selection, use the multiSelectGroup value
	if (state.multiSelectGroup) {
		return state.multiSelectGroup.lockAspectRatio ?? false;
	}

	// For a single selection, use the selected object's value
	for (const id of state.selectedIds) {
		const obj = state.objects[id];
		if (
			obj &&
			"lockAspectRatio" in obj &&
			typeof obj.lockAspectRatio === "boolean"
		) {
			return obj.lockAspectRatio;
		}
	}
	return false;
};
