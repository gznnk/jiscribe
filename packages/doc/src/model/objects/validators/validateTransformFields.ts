import { isNumber } from "@jiscribe/basic-validators";

import type { SemanticDiagnostic } from "../../types/SemanticDiagnostic";

/** Validate optional transform fields: `rotation` (number), `flipX`/`flipY`/`lockAspectRatio` (boolean). */
export function validateTransformFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if ("rotation" in o && !isNumber(o.rotation)) {
		errors.push({
			path: `${path}.rotation`,
			message: "must be a number",
			severity: "error",
		});
	}
	if ("flipX" in o && typeof o.flipX !== "boolean") {
		errors.push({
			path: `${path}.flipX`,
			message: "must be a boolean",
			severity: "error",
		});
	}
	if ("flipY" in o && typeof o.flipY !== "boolean") {
		errors.push({
			path: `${path}.flipY`,
			message: "must be a boolean",
			severity: "error",
		});
	}
	if ("lockAspectRatio" in o && typeof o.lockAspectRatio !== "boolean") {
		errors.push({
			path: `${path}.lockAspectRatio`,
			message: "must be a boolean",
			severity: "error",
		});
	}
	return errors;
}
