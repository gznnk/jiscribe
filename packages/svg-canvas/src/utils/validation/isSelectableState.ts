import { isBoolean, isObject } from "@workspace/validation";

import type { SelectableState } from "../../types/state/core/SelectableState";

/**
 * Check if an object is SelectableState.
 *
 * @param obj - The object to check
 * @returns True if the object is SelectableState, false otherwise
 */
export const isSelectableState = (obj: unknown): obj is SelectableState => {
	if (!isObject(obj)) {
		return false;
	}
	if (!("isSelected" in obj) || !isBoolean(obj.isSelected)) {
		return false;
	}
	if (!("isRootSelected" in obj) || !isBoolean(obj.isRootSelected)) {
		return false;
	}
	if (!("isAncestorSelected" in obj) || !isBoolean(obj.isAncestorSelected)) {
		return false;
	}
	if (!("showOutline" in obj) || !isBoolean(obj.showOutline)) {
		return false;
	}
	if (!("outlineDisabled" in obj) || !isBoolean(obj.outlineDisabled)) {
		return false;
	}

	return true;
};
