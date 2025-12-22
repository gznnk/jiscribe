import { isObject } from "@workspace/validation";

import { DiagramRegistry } from "../../registry";
import type { DiagramType } from "../../types/core/DiagramType";

/**
 * Check if an object is exportable.
 *
 * @param obj - The object to check
 * @returns True if the object is exportable, false otherwise
 */
export const isExportable = (obj: unknown): boolean => {
	if (!isObject(obj)) return false;

	return (
		"type" in obj &&
		DiagramRegistry.getExportFunction(obj.type as DiagramType) !== undefined
	);
};
