import { isBoolean, isObject } from "@workspace/basic-validators";

import type { TransformativeData } from "../../types/data/core/TransformativeData";

/**
 * Check if data has valid transformation properties (transformative feature).
 */
export const isTransformativeData = (
	data: unknown,
): data is TransformativeData => {
	if (!isObject(data)) return false;
	return (
		// TODO: 要精査
		// isFrame(data) &&
		"keepProportion" in data &&
		isBoolean(data.keepProportion) &&
		"rotateEnabled" in data &&
		isBoolean(data.rotateEnabled) &&
		"inversionEnabled" in data &&
		isBoolean(data.inversionEnabled)
	);
};
