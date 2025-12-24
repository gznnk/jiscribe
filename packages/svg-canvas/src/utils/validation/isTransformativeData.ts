import { isBoolean } from "@workspace/basic-validators";
import { isFrame } from "@workspace/geometry";

import type { TransformativeData } from "../../types/data/core/TransformativeData";

/**
 * Check if data has valid transformation properties (transformative feature).
 */
export const isTransformativeData = (
	data: unknown,
): data is TransformativeData => {
	return (
		isFrame(data) &&
		"keepProportion" in data &&
		isBoolean(data.keepProportion) &&
		"rotateEnabled" in data &&
		isBoolean(data.rotateEnabled) &&
		"inversionEnabled" in data &&
		isBoolean(data.inversionEnabled)
	);
};
