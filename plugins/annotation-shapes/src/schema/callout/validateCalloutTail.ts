import { isNumber, isObject } from "@jiscribe/basic-validators";
import type { ObjectDocValidateFn } from "@jiscribe/canvas-sdk/doc";
import type { SemanticDiagnostic } from "@jiscribe/doc";

import { CALLOUT_TAIL_SIDES, isCalloutTailSide } from "./CalloutDoc";

/** Validates the callout-specific `tail` (optional): side enum + position in [0, 1]. */
export const validateCalloutTail: ObjectDocValidateFn = (o, path) => {
	if (!("tail" in o) || o.tail === undefined) {
		return [];
	}
	if (!isObject(o.tail)) {
		return [{ path: `${path}.tail`, message: "must be an object" }];
	}
	const tail = o.tail as Record<string, unknown>;
	const errors: SemanticDiagnostic[] = [];
	if (!isCalloutTailSide(tail.side)) {
		errors.push({
			path: `${path}.tail.side`,
			message: `must be one of ${CALLOUT_TAIL_SIDES.map((side) => `"${side}"`).join(" | ")}`,
		});
	}
	if (!isNumber(tail.position) || tail.position < 0 || tail.position > 1) {
		errors.push({
			path: `${path}.tail.position`,
			message: "must be a number between 0 and 1",
		});
	}
	return errors;
};
