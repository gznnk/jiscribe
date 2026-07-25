import {
	isNonNegativeNumber,
	isNumber,
	isObject,
} from "@workspace/basic-validators";

import type { Frame } from "../types/Frame";

/** Type guard for {@link Frame}. Width and height must be non-negative. */
export const isFrame = (obj: unknown): obj is Frame => {
	if (!isObject(obj)) {
		return false;
	}

	return (
		"cx" in obj &&
		isNumber(obj.cx) &&
		"cy" in obj &&
		isNumber(obj.cy) &&
		"width" in obj &&
		isNonNegativeNumber(obj.width) &&
		"height" in obj &&
		isNonNegativeNumber(obj.height)
	);
};
