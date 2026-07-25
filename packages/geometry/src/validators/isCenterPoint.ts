import { isNumber, isObject } from "@workspace/basic-validators";

import type { CenterPoint } from "../types/CenterPoint";

/** Type guard for {@link CenterPoint}. */
export const isCenterPoint = (value: unknown): value is CenterPoint => {
	if (!isObject(value)) {
		return false;
	}

	return (
		"cx" in value && isNumber(value.cx) && "cy" in value && isNumber(value.cy)
	);
};
