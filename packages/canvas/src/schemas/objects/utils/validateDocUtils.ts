import { isCssSafeValue, isNumber, isString } from "@jiscribe/basic-validators";

import type { SemanticDiagnostic } from "../../canvas/validators/types";
import { isArrowType } from "../types/ArrowType";
import { isEdgeAnchorSide } from "../types/EndpointRef";
import { isPoly } from "../types/Poly";
import { isStrokeDashType } from "../types/StrokeDashType";
import { isTextAlign } from "../types/TextAlign";
import { isVerticalAlign } from "../types/VerticalAlign";

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
		return [{ path: `${path}.${key}`, message: "must be a number" }];
	}
	if (min !== undefined && value < min) {
		return [{ path: `${path}.${key}`, message: `must be >= ${min}` }];
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

/**
 * Validate a `points` array: it must be a valid poly and have at least `minPoints` points.
 * Used for polyline/polygon shapes that require endpoint coordinates in their points array.
 */
export function validatePolyFields(
	o: Record<string, unknown>,
	path: string,
	minPoints = 2,
): SemanticDiagnostic[] {
	if (!isPoly(o)) {
		return [
			{ path: `${path}.points`, message: "must be a valid points array" },
		];
	}
	if (o.points.length < minPoints) {
		return [
			{
				path: `${path}.points`,
				message: `must have at least ${minPoints} points`,
			},
		];
	}
	return [];
}

/**
 * Validate a connector's points (intermediate waypoints).
 * Since endpoint coordinates are held by the source/target EndpointRef, an empty array
 * (= a straight connector) is allowed, unlike polyline/polygon. `points` is optional and
 * defaults to an empty array, so an absent key is also valid; only a present-but-malformed
 * value is an error.
 */
export function validateWaypointFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	if (!("points" in o) || o.points === undefined) {
		return [];
	}
	if (!isPoly(o)) {
		return [
			{ path: `${path}.points`, message: "must be a valid points array" },
		];
	}
	return [];
}

/**
 * Validate a connector EndpointRef, dispatching to owned or free endpoint validation
 * based on whether an `owner` is present. Non-object refs are treated as valid (no-op).
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
		errors.push({ path: `${path}.owner`, message: "must be an object" });
	} else {
		const owner = r.owner as Record<string, unknown>;
		if (!isString(owner.id)) {
			errors.push({ path: `${path}.owner.id`, message: "must be a string" });
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
		return [{ path: `${path}.anchor`, message: "must be an object" }];
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
		});
	}
	if (!isNumber(a.t) || !Number.isFinite(a.t) || a.t < 0 || a.t > 1) {
		errors.push({
			path: `${path}.anchor.t`,
			message: "must be a number between 0 and 1",
		});
	}
	return errors;
}

function validateFreeAnchor(
	anchor: unknown,
	path: string,
): SemanticDiagnostic[] {
	if (typeof anchor !== "object" || anchor === null) {
		return [{ path: `${path}.anchor`, message: "must be an object" }];
	}

	const a = anchor as Record<string, unknown>;
	if (a.kind !== "free") {
		return [
			{
				path: `${path}.anchor.kind`,
				message: "must be 'free' for free endpoint",
			},
		];
	}

	const errors: SemanticDiagnostic[] = [];
	if (typeof a.point !== "object" || a.point === null) {
		errors.push({ path: `${path}.anchor.point`, message: "must be an object" });
	} else {
		const p = a.point as Record<string, unknown>;
		if (!isNumber(p.x)) {
			errors.push({
				path: `${path}.anchor.point.x`,
				message: "must be a number",
			});
		}
		if (!isNumber(p.y)) {
			errors.push({
				path: `${path}.anchor.point.y`,
				message: "must be a number",
			});
		}
	}
	return errors;
}

/** Validate optional transform fields: `rotation` (number), `flipX`/`flipY` (boolean). */
export function validateTransformFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if ("rotation" in o && !isNumber(o.rotation)) {
		errors.push({ path: `${path}.rotation`, message: "must be a number" });
	}
	if ("flipX" in o && typeof o.flipX !== "boolean") {
		errors.push({ path: `${path}.flipX`, message: "must be a boolean" });
	}
	if ("flipY" in o && typeof o.flipY !== "boolean") {
		errors.push({ path: `${path}.flipY`, message: "must be a boolean" });
	}
	return errors;
}

/** Validate optional stroke style fields: `stroke` (safe CSS color), `strokeWidth` (≥ 0), `strokeDashType`. */
export function validateStrokeStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if ("stroke" in o && !isCssSafeValue(o.stroke)) {
		errors.push({
			path: `${path}.stroke`,
			message: "must be a safe CSS color value",
			beyondSchema: true,
		});
	}
	// strokeWidth has minimum: 0 in the schema
	errors.push(...validateOptionalNumber(o, path, "strokeWidth", 0));
	if ("strokeDashType" in o && !isStrokeDashType(o.strokeDashType)) {
		errors.push({
			path: `${path}.strokeDashType`,
			message: "must be one of: solid, dashed, dotted",
		});
	}
	return errors;
}

/** Validate the optional `fill` field as a safe CSS color value. */
export function validateFillStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if ("fill" in o && !isCssSafeValue(o.fill)) {
		errors.push({
			path: `${path}.fill`,
			message: "must be a safe CSS color value",
			beyondSchema: true,
		});
	}
	return errors;
}

/**
 * Validate the styling fields a text carries — `textAlign`, `verticalAlign`,
 * `fontColor` (safe CSS color), `fontSize` (≥ 1), and
 * `fontFamily`/`fontWeight`/`fontStyle`/`textDecoration` (safe CSS values). The
 * same names appear flat on a single-body doc and inside each slot of a keyed
 * one, so both forms validate them through here.
 *
 * @param o - The object carrying the styling: the doc itself, or one of its text slots
 * @param path - Diagnostic path of `o`, which each field name is appended to
 * @returns One diagnostic per malformed field; empty when every field is absent or valid
 */
export function validateTextSlotStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if ("textAlign" in o && !isTextAlign(o.textAlign)) {
		errors.push({
			path: `${path}.textAlign`,
			message: "must be one of: left, center, right",
		});
	}
	if ("verticalAlign" in o && !isVerticalAlign(o.verticalAlign)) {
		errors.push({
			path: `${path}.verticalAlign`,
			message: "must be one of: top, middle, bottom",
		});
	}
	if ("fontColor" in o && !isCssSafeValue(o.fontColor)) {
		errors.push({
			path: `${path}.fontColor`,
			message: "must be a safe CSS color value",
			beyondSchema: true,
		});
	}
	// fontSize has minimum: 1 in the schema
	errors.push(...validateOptionalNumber(o, path, "fontSize", 1));
	if ("fontFamily" in o && !isCssSafeValue(o.fontFamily)) {
		errors.push({
			path: `${path}.fontFamily`,
			message: "must be a safe CSS font-family value",
			beyondSchema: true,
		});
	}
	if ("fontWeight" in o && !isCssSafeValue(o.fontWeight)) {
		errors.push({
			path: `${path}.fontWeight`,
			message: "must be a safe CSS font-weight value",
			beyondSchema: true,
		});
	}
	if ("fontStyle" in o && !isCssSafeValue(o.fontStyle)) {
		errors.push({
			path: `${path}.fontStyle`,
			message: "must be a safe CSS font-style value",
			beyondSchema: true,
		});
	}
	if ("textDecoration" in o && !isCssSafeValue(o.textDecoration)) {
		errors.push({
			path: `${path}.textDecoration`,
			message: "must be a safe CSS text-decoration value",
			beyondSchema: true,
		});
	}
	return errors;
}

/**
 * Validate the text group of a single-body doc (features.text: "body"): `text`
 * as a plain string plus the flat styling fields. A keyed object is rejected
 * here — a type whose text is keyed declares `text: "slots"` and validates its
 * own closed slot set (see the record shape).
 *
 * @param o - The doc to check; a missing `text` is valid (it reads as empty)
 * @param path - Diagnostic path of `o`, which each field name is appended to
 * @returns One diagnostic per malformed field; empty when the whole group is valid
 */
export function validateTextStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if ("text" in o && !isString(o.text)) {
		errors.push({ path: `${path}.text`, message: "must be a string" });
	}
	errors.push(...validateTextSlotStyleFields(o, path));
	return errors;
}

/** Validate the optional corner-radius field `rx` (≥ 0). */
export function validateRadiusStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	// The corner radius rx has minimum: 0 in the schema
	return validateOptionalNumber(o, path, "rx", 0);
}

/** Validate optional arrowhead fields `startArrow`/`endArrow` as valid ArrowType values. */
export function validateArrowFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if ("startArrow" in o && !isArrowType(o.startArrow)) {
		errors.push({
			path: `${path}.startArrow`,
			message: "must be a valid ArrowType",
		});
	}
	if ("endArrow" in o && !isArrowType(o.endArrow)) {
		errors.push({
			path: `${path}.endArrow`,
			message: "must be a valid ArrowType",
		});
	}
	return errors;
}
