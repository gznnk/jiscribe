import { isNonNegativeNumber, isObject } from "@workspace/basic-validators";

import type { CornerRoundableData } from "../../types/data/core/CornerRoundableData";

/**
 * Check if data has valid corner radius properties (cornerRoundable feature).
 */
export const isCornerRoundableData = (
	data: unknown,
): data is CornerRoundableData => {
	if (!isObject(data)) {
		return false;
	}

	return "cornerRadius" in data && isNonNegativeNumber(data.cornerRadius);
};
