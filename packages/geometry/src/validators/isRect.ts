import {
	isNonNegativeNumber,
	isNumber,
	isObject,
} from "@workspace/basic-validators";

import type { Rect } from "../types/Rect";

/** Type guard for {@link Rect}. Width and height must be non-negative. */
export const isRect = (obj: unknown): obj is Rect => {
	if (!isObject(obj)) {
		return false;
	}

	return (
		"x" in obj &&
		isNumber(obj.x) &&
		"y" in obj &&
		isNumber(obj.y) &&
		"width" in obj &&
		isNonNegativeNumber(obj.width) &&
		"height" in obj &&
		isNonNegativeNumber(obj.height)
	);
};
