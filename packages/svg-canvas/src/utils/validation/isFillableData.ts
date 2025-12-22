import { isCssColor, isObject } from "@workspace/validation";

import type { FillableData } from "../../types/data/core/FillableData";

/**
 * Check if data has valid fill properties (fillable feature).
 */
export const isFillableData = (data: unknown): data is FillableData => {
	if (!isObject(data)) return false;

	return "fill" in data && isCssColor(data.fill);
};
