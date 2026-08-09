import {
	isNonNegativeNumber,
	isNumber,
	isObject,
} from "@jiscribe/basic-validators";

import type { Frame } from "../types/Frame";

/**
 * Type guard for {@link Frame}. Width and height must be non-negative.
 *
 * @param value - Value to narrow; extra properties are allowed, so a
 *   {@link TransformedFrame} passes too
 */
export const isFrame = (value: unknown): value is Frame => {
	if (!isObject(value)) {
		return false;
	}

	return (
		"cx" in value &&
		isNumber(value.cx) &&
		"cy" in value &&
		isNumber(value.cy) &&
		"width" in value &&
		isNonNegativeNumber(value.width) &&
		"height" in value &&
		isNonNegativeNumber(value.height)
	);
};
