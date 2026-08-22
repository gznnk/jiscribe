import type { ObjectDocValidateFn } from "@jiscribe/canvas-sdk/doc";
import type { SemanticDiagnostic } from "@jiscribe/doc";

import {
	GROUP_MARKER_DIRECTIONS,
	isGroupMarkerDirection,
	isGroupMarkerTipPosition,
} from "./GroupMarkerFields";

/** Validates a group marker's `direction` (optional on every marker). */
export const validateGroupMarkerDirection: ObjectDocValidateFn = (o, path) => {
	if (o.direction === undefined || isGroupMarkerDirection(o.direction)) {
		return [];
	}
	return [
		{
			path: `${path}.direction`,
			message: `must be one of ${GROUP_MARKER_DIRECTIONS.map((direction) => `"${direction}"`).join(" | ")}`,
		},
	];
};

/**
 * Validates `direction` plus the `tipPosition` of the markers that have a
 * movable tip. A marker without one uses `validateGroupMarkerDirection`
 * instead: parse-time validation reports no diagnostic for a field the type
 * does not declare, so a stray `tipPosition` is simply dropped by the mapper
 * (only the published JSON Schema, which is `additionalProperties: false`,
 * flags it).
 */
export const validateGroupMarkerTipFields: ObjectDocValidateFn = (o, path) => {
	const errors: SemanticDiagnostic[] = validateGroupMarkerDirection(o, path);
	if (o.tipPosition !== undefined && !isGroupMarkerTipPosition(o.tipPosition)) {
		errors.push({
			path: `${path}.tipPosition`,
			message: "must be a number between 0 and 1",
		});
	}
	return errors;
};
