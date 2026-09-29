import { isNumber } from "@jiscribe/basic-validators";

import type { SemanticDiagnostic } from "../../types/SemanticDiagnostic";

/**
 * Validate a required numeric field: it must be a number and, when `min` is given, meet the lower bound.
 * The lower bound corresponds to the schema's `minimum` constraint (width/height/radius ≥ 0, etc.).
 */
export function validateRequiredNumber(
	o: Record<string, unknown>,
	path: string,
	key: string,
	min?: number,
): SemanticDiagnostic[] {
	const value = o[key];
	if (!isNumber(value)) {
		return [
			{
				path: `${path}.${key}`,
				message: "must be a number",
				severity: "error",
			},
		];
	}
	if (min !== undefined && value < min) {
		return [
			{
				path: `${path}.${key}`,
				message: `must be >= ${min}`,
				severity: "error",
			},
		];
	}
	return [];
}

/**
 * Validate an optional numeric field: validate number / lower bound only when present,
 * and do not error when unspecified (key absent / undefined).
 */
export function validateOptionalNumber(
	o: Record<string, unknown>,
	path: string,
	key: string,
	min?: number,
): SemanticDiagnostic[] {
	if (!(key in o) || o[key] === undefined) {
		return [];
	}
	return validateRequiredNumber(o, path, key, min);
}
