import {
	isCssColor,
	isNonNegativeNumber,
	isObject,
} from "@workspace/basic-validators";

import { isStrokeDashType } from "./isStrokeDashType";
import type { StrokableData } from "../../types/data/core/StrokableData";

/**
 * Check if data has valid stroke properties (strokable feature).
 */
export const isStrokableData = (data: unknown): data is StrokableData => {
	if (!isObject(data)) {
		return false;
	}

	return (
		"stroke" in data &&
		isCssColor(data.stroke) &&
		"strokeWidth" in data &&
		isNonNegativeNumber(data.strokeWidth) &&
		"strokeDashType" in data &&
		isStrokeDashType(data.strokeDashType)
	);
};
