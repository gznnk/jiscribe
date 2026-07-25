import {
	isNonNegativeNumber,
	isNumber,
	isObject,
} from "@workspace/basic-validators";

import type { Ellipse } from "../types/Ellipse";

/** Type guard for {@link Ellipse}. Radii must be non-negative. */
export const isEllipse = (obj: unknown): obj is Ellipse => {
	if (!isObject(obj)) {
		return false;
	}

	return (
		"cx" in obj &&
		isNumber(obj.cx) &&
		"cy" in obj &&
		isNumber(obj.cy) &&
		"rx" in obj &&
		isNonNegativeNumber(obj.rx) &&
		"ry" in obj &&
		isNonNegativeNumber(obj.ry)
	);
};
