import { isNumber, isString } from "@jiscribe/basic-validators";

import type { SemanticDiagnostic } from "../../types/SemanticDiagnostic";
import { isEdgeAnchorSide } from "../types/EndpointRef";

/**
 * Validate a connector EndpointRef, dispatching to owned or free endpoint validation
 * based on whether an `owner` is present. Non-object refs are treated as valid (no-op):
 * whether an endpoint may be absent at all is the caller's rule (`validateConnectorDoc`
 * requires both to be present), so this checks only the shape of a ref that is there.
 */
export function validateEndpointRef(
	ref: unknown,
	path: string,
): SemanticDiagnostic[] {
	if (typeof ref !== "object" || ref === null) {
		return [];
	}
	const r = ref as Record<string, unknown>;

	// Distinguish OwnedEndpointRef / FreeEndpointRef by the presence of owner
	const hasOwner = "owner" in r && r.owner != null;
	return hasOwner
		? validateOwnedEndpointRef(r, path)
		: validateFreeEndpointRef(r, path);
}

function validateOwnedEndpointRef(
	r: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];

	if (typeof r.owner !== "object") {
		errors.push({
			path: `${path}.owner`,
			message: "must be an object",
			severity: "error",
		});
	} else {
		const owner = r.owner as Record<string, unknown>;
		if (!isString(owner.id)) {
			errors.push({
				path: `${path}.owner.id`,
				message: "must be a string",
				severity: "error",
			});
		}
	}

	errors.push(...validateNonFreeAnchor(r.anchor, path));
	return errors;
}

function validateFreeEndpointRef(
	r: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	return validateFreeAnchor(r.anchor, path);
}

function validateNonFreeAnchor(
	anchor: unknown,
	path: string,
): SemanticDiagnostic[] {
	if (typeof anchor !== "object" || anchor === null) {
		return [
			{
				path: `${path}.anchor`,
				message: "must be an object",
				severity: "error",
			},
		];
	}

	const a = anchor as Record<string, unknown>;
	if (a.kind === "center") {
		return [];
	}
	if (a.kind === "connectPoint") {
		// Membership is not checked: the set is open (each object type may declare
		// points of its own), so which ids exist is a registry question rather than a
		// doc-schema one, and an id nothing declares renders as the owner's center
		// (see resolveEndpoint). "center" is still rejected, because it is the one id
		// that can never be declared: the center is its own anchor kind.
		if (!isString(a.id) || a.id === "" || a.id === "center") {
			return [
				{
					path: `${path}.anchor.id`,
					message:
						"must be a non-empty string other than 'center' (use { kind: 'center' })",
					severity: "error",
				},
			];
		}
		return [];
	}
	if (a.kind === "edge") {
		return validateEdgeAnchor(a, path);
	}
	return [
		{
			path: `${path}.anchor.kind`,
			message: "must be 'center', 'connectPoint' or 'edge' for owned endpoint",
			severity: "error",
		},
	];
}

/**
 * Validate an edge anchor's `side` (one of the four) and `t` (a finite ratio in
 * 0..1). A ratio outside the range is reported rather than clamped: the engine
 * does not silently rewrite a doc, so an author (or an AI) sees the mistake
 * instead of a connector quietly landing somewhere else.
 */
function validateEdgeAnchor(
	a: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if (!isEdgeAnchorSide(a.side)) {
		errors.push({
			path: `${path}.anchor.side`,
			message: "must be one of: top, right, bottom, left",
			severity: "error",
		});
	}
	if (!isNumber(a.t) || a.t < 0 || a.t > 1) {
		errors.push({
			path: `${path}.anchor.t`,
			message: "must be a number between 0 and 1",
			severity: "error",
		});
	}
	return errors;
}

function validateFreeAnchor(
	anchor: unknown,
	path: string,
): SemanticDiagnostic[] {
	if (typeof anchor !== "object" || anchor === null) {
		return [
			{
				path: `${path}.anchor`,
				message: "must be an object",
				severity: "error",
			},
		];
	}

	const a = anchor as Record<string, unknown>;
	if (a.kind !== "free") {
		return [
			{
				path: `${path}.anchor.kind`,
				message: "must be 'free' for free endpoint",
				severity: "error",
			},
		];
	}

	const errors: SemanticDiagnostic[] = [];
	if (typeof a.point !== "object" || a.point === null) {
		errors.push({
			path: `${path}.anchor.point`,
			message: "must be an object",
			severity: "error",
		});
	} else {
		const p = a.point as Record<string, unknown>;
		if (!isNumber(p.x)) {
			errors.push({
				path: `${path}.anchor.point.x`,
				message: "must be a number",
				severity: "error",
			});
		}
		if (!isNumber(p.y)) {
			errors.push({
				path: `${path}.anchor.point.y`,
				message: "must be a number",
				severity: "error",
			});
		}
	}
	return errors;
}
