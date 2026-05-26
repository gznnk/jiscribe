import { isArray, isObject } from "@workspace/basic-validators";

import type { GroupState } from "../../types/state/shapes/GroupState";

/**
 * Check if an object is GroupState.
 *
 * @param obj - The object to check
 * @returns True if the object is GroupState, false otherwise
 */
export const isGroupState = (obj: unknown): obj is GroupState => {
	if (!isObject(obj)) {
		return false;
	}

	return (
		"type" in obj &&
		obj.type === "Group" &&
		"items" in obj &&
		isArray(obj.items)
	);
};
