import { isNumber, isObject } from "@workspace/validation";

import type { OriginableData } from "../../types/data/core/OriginableData";

/**
 * Check if data has valid origin properties (originable feature).
 */
export const isOriginableData = (data: unknown): data is OriginableData => {
	if (!isObject(data)) return false;

	return (
		"originX" in data &&
		isNumber(data.originX) &&
		"originY" in data &&
		isNumber(data.originY)
	);
};
