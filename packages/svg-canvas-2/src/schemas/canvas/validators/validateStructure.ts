import { isArray, isNumber, isObject, isString } from "@workspace/basic-validators";

import type { SemanticDiagnostic } from "./types";

function isPointShape(value: unknown): boolean {
	if (!isObject(value)) return false;
	const v = value as Record<string, unknown>;
	return isNumber(v.x) && isNumber(v.y);
}

function validatePoints(points: unknown[], path: string): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if (points.length < 2) {
		errors.push({ path, message: "must have at least 2 points" });
	}
	points.forEach((pt, i) => {
		if (!isPointShape(pt)) {
			errors.push({ path: `${path}[${i}]`, message: "must be { x: number, y: number }" });
		}
	});
	return errors;
}

function validateEndpointRef(ref: unknown, path: string): SemanticDiagnostic[] {
	if (!isObject(ref)) return [];
	const r = ref as Record<string, unknown>;
	if (!("owner" in r)) return [];
	const errors: SemanticDiagnostic[] = [];
	if (!isObject(r.owner)) {
		errors.push({ path: `${path}.owner`, message: "must be an object" });
	} else {
		const owner = r.owner as Record<string, unknown>;
		if (!isString(owner.id)) errors.push({ path: `${path}.owner.id`, message: "must be a string" });
		if (!isString(owner.type)) errors.push({ path: `${path}.owner.type`, message: "must be a string" });
	}
	return errors;
}

function validateObjectNode(obj: unknown, path: string): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];

	if (!isObject(obj)) {
		return [{ path, message: "must be an object" }];
	}

	const o = obj as Record<string, unknown>;

	if (!isString(o.id) || (o.id as string).length === 0) {
		errors.push({ path: `${path}.id`, message: "must be a non-empty string" });
	}

	if (!isString(o.type)) {
		errors.push({ path: `${path}.type`, message: "must be a string" });
		return errors;
	}

	switch (o.type) {
		case "rect":
		case "sticky":
			if (!isNumber(o.x)) errors.push({ path: `${path}.x`, message: "must be a number" });
			if (!isNumber(o.y)) errors.push({ path: `${path}.y`, message: "must be a number" });
			if (!isNumber(o.width)) errors.push({ path: `${path}.width`, message: "must be a number" });
			if (!isNumber(o.height)) errors.push({ path: `${path}.height`, message: "must be a number" });
			break;

		case "ellipse":
			if (!isNumber(o.cx)) errors.push({ path: `${path}.cx`, message: "must be a number" });
			if (!isNumber(o.cy)) errors.push({ path: `${path}.cy`, message: "must be a number" });
			if (!isNumber(o.rx)) errors.push({ path: `${path}.rx`, message: "must be a number" });
			if (!isNumber(o.ry)) errors.push({ path: `${path}.ry`, message: "must be a number" });
			break;

		case "group":
			if (!isArray(o.children)) {
				errors.push({ path: `${path}.children`, message: "must be an array" });
			} else {
				(o.children as unknown[]).forEach((child, i) => {
					errors.push(...validateObjectNode(child, `${path}.children[${i}]`));
				});
			}
			break;

		case "polyline":
		case "polygon":
			if (!isArray(o.points)) {
				errors.push({ path: `${path}.points`, message: "must be an array" });
			} else {
				errors.push(...validatePoints(o.points as unknown[], `${path}.points`));
			}
			break;

		case "connector":
			if (!isArray(o.points)) {
				errors.push({ path: `${path}.points`, message: "must be an array" });
			} else {
				errors.push(...validatePoints(o.points as unknown[], `${path}.points`));
			}
			if ("source" in o) errors.push(...validateEndpointRef(o.source, `${path}.source`));
			if ("target" in o) errors.push(...validateEndpointRef(o.target, `${path}.target`));
			break;
	}

	return errors;
}

export function validateStructure(doc: unknown): SemanticDiagnostic[] {
	if (!isObject(doc)) {
		return [{ path: "/", message: "Document must be an object with 'root' and 'connectors' fields" }];
	}

	const d = doc as Record<string, unknown>;
	const errors: SemanticDiagnostic[] = [];

	if (!isArray(d.root)) {
		errors.push({ path: "root", message: "must be an array" });
	} else {
		(d.root as unknown[]).forEach((obj, i) => {
			errors.push(...validateObjectNode(obj, `root[${i}]`));
		});
	}

	if (!isArray(d.connectors)) {
		errors.push({ path: "connectors", message: "must be an array" });
	} else {
		(d.connectors as unknown[]).forEach((obj, i) => {
			errors.push(...validateObjectNode(obj, `connectors[${i}]`));
		});
	}

	return errors;
}
