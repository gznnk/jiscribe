import {
	isNonNegativeNumber,
	isNumber,
	isObject,
} from "@jiscribe/basic-validators";

import type { Ellipse } from "../types/Ellipse";

/**
 * Type guard for {@link Ellipse}. Radii must be non-negative.
 *
 * @param value - Value to narrow; extra properties are allowed, so a
 *   {@link TransformedEllipse} passes too
 */
export const isEllipse = (value: unknown): value is Ellipse => {
	if (!isObject(value)) {
		return false;
	}

	return (
		"cx" in value &&
		isNumber(value.cx) &&
		"cy" in value &&
		isNumber(value.cy) &&
		"rx" in value &&
		isNonNegativeNumber(value.rx) &&
		"ry" in value &&
		isNonNegativeNumber(value.ry)
	);
};
