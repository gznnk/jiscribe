import { isArray, isNumber, isObject, isString } from "@workspace/basic-validators";

import type { SemanticDiagnostic } from "../../canvas/validators/types";

export function validatePointsField(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if (!isArray(o.points)) {
		errors.push({ path: `${path}.points`, message: "must be an array" });
		return errors;
	}
	const points = o.points as unknown[];
	if (points.length < 2) {
		errors.push({
			path: `${path}.points`,
			message: "must have at least 2 points",
		});
	}
	points.forEach((pt, i) => {
		const p = pt as Record<string, unknown>;
		if (!isObject(pt) || !isNumber(p.x) || !isNumber(p.y)) {
			errors.push({
				path: `${path}.points[${i}]`,
				message: "must be { x: number, y: number }",
			});
		}
	});
	return errors;
}

export function validateEndpointRef(
	ref: unknown,
	path: string,
): SemanticDiagnostic[] {
	if (!isObject(ref)) return [];
	const r = ref as Record<string, unknown>;
	if (!("owner" in r)) return [];
	const errors: SemanticDiagnostic[] = [];
	if (!isObject(r.owner)) {
		errors.push({ path: `${path}.owner`, message: "must be an object" });
	} else {
		const owner = r.owner as Record<string, unknown>;
		if (!isString(owner.id))
			errors.push({ path: `${path}.owner.id`, message: "must be a string" });
		if (!isString(owner.type))
			errors.push({ path: `${path}.owner.type`, message: "must be a string" });
	}
	return errors;
}
