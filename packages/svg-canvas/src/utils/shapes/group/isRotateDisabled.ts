import { hasRotateDisabledItem } from "./hasRotateDisabledItem";
import type { TransformativeState } from "../../../types/state/core/TransformativeState";
import { isItemableState } from "../../validation/isItemableState";

/**
 * Check if rotation should be disabled for a transformative diagram.
 * Returns true if either:
 * - The diagram itself has rotateEnabled: false
 * - The diagram is an itemable (group) that contains any items with rotateEnabled: false
 *
 * @param diagram - The transformative diagram to check
 * @returns True if rotation should be disabled, false otherwise
 */
export const isRotateDisabled = (diagram: TransformativeState): boolean => {
	// Check if the diagram itself has rotation disabled
	if (!diagram.rotateEnabled) {
		return true;
	}

	// Check if it's a group containing items with rotation disabled
	if (isItemableState(diagram) && hasRotateDisabledItem(diagram.items || [])) {
		return true;
	}

	return false;
};
