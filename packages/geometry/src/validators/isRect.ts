import {
	isNonNegativeNumber,
	isNumber,
	isObject,
} from "@workspace/basic-validators";

import type { Rect } from "../types/Rect";

/**
 * Type guard for {@link Rect}. Width and height must be non-negative.
 *
 * @param value - Value to narrow; extra properties are allowed, so a
 *   {@link TransformedRect} passes too
 */
export const isRect = (value: unknown): value is Rect => {
	if (!isObject(value)) {
		return false;
	}

	return (
		"x" in value &&
		isNumber(value.x) &&
		"y" in value &&
		isNumber(value.y) &&
		"width" in value &&
		isNonNegativeNumber(value.width) &&
		"height" in value &&
		isNonNegativeNumber(value.height)
	);
};
