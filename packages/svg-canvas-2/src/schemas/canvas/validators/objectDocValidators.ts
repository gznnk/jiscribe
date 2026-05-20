import { isArray, isNumber, isObject, isString } from "@workspace/basic-validators";

import type { SemanticDiagnostic } from "./types";
import type { ObjectDocValidateFn } from "../../registry/ObjectDocValidatorRegistry";

function validatePointsField(
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

function validateEndpointRef(
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

export const validateRectDoc: ObjectDocValidateFn = (o, path) => {
	const errors: SemanticDiagnostic[] = [];
	if (!isNumber(o.x)) errors.push({ path: `${path}.x`, message: "must be a number" });
	if (!isNumber(o.y)) errors.push({ path: `${path}.y`, message: "must be a number" });
	if (!isNumber(o.width)) errors.push({ path: `${path}.width`, message: "must be a number" });
	if (!isNumber(o.height)) errors.push({ path: `${path}.height`, message: "must be a number" });
	return errors;
};

export const validateEllipseDoc: ObjectDocValidateFn = (o, path) => {
	const errors: SemanticDiagnostic[] = [];
	if (!isNumber(o.cx)) errors.push({ path: `${path}.cx`, message: "must be a number" });
	if (!isNumber(o.cy)) errors.push({ path: `${path}.cy`, message: "must be a number" });
	if (!isNumber(o.rx)) errors.push({ path: `${path}.rx`, message: "must be a number" });
	if (!isNumber(o.ry)) errors.push({ path: `${path}.ry`, message: "must be a number" });
	return errors;
};

export const validateGroupDoc: ObjectDocValidateFn = (_o, _path) => {
	// children の配列検証と再帰処理は validateStructure.ts 側で行う
	return [];
};

export const validatePolylineDoc: ObjectDocValidateFn = (o, path) =>
	validatePointsField(o, path);

export const validatePolygonDoc: ObjectDocValidateFn = (o, path) =>
	validatePointsField(o, path);

export const validateConnectorDoc: ObjectDocValidateFn = (o, path) => {
	const errors = validatePointsField(o, path);
	if ("source" in o) errors.push(...validateEndpointRef(o.source, `${path}.source`));
	if ("target" in o) errors.push(...validateEndpointRef(o.target, `${path}.target`));
	return errors;
};

export const validateStickyDoc: ObjectDocValidateFn = (o, path) => {
	const errors: SemanticDiagnostic[] = [];
	if (!isNumber(o.x)) errors.push({ path: `${path}.x`, message: "must be a number" });
	if (!isNumber(o.y)) errors.push({ path: `${path}.y`, message: "must be a number" });
	if (!isNumber(o.width)) errors.push({ path: `${path}.width`, message: "must be a number" });
	if (!isNumber(o.height)) errors.push({ path: `${path}.height`, message: "must be a number" });
	return errors;
};
