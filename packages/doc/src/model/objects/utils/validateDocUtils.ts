import {
	isCssSafeValue,
	isNumber,
	isObject,
	isString,
} from "@jiscribe/basic-validators";

import type { SemanticDiagnostic } from "../../types/SemanticDiagnostic";
import type { ArrowStyleDoc } from "../base/ArrowStyleDoc";
import type { FillStyleDoc } from "../base/FillStyleDoc";
import type { RadiusStyleDoc } from "../base/RadiusStyleDoc";
import { CORNER_RADIUS_MIN } from "../base/RadiusStyleDoc";
import type { StrokeStyleDoc } from "../base/StrokeStyleDoc";
import { STROKE_WIDTH_MIN } from "../base/StrokeStyleDoc";
import { isArrowType } from "../types/ArrowType";
import { isEdgeAnchorSide } from "../types/EndpointRef";
import { isPoly } from "../types/Poly";
import type { InlineTextStyle } from "../types/RichText";
import { FONT_SIZE_MIN } from "../types/RichText";
import { isStrokeDashType } from "../types/StrokeDashType";
import { isTextAlign } from "../types/TextAlign";
import type { TextSlotStyle } from "../types/TextSlot";
import { isTextVerticalBasis } from "../types/TextVerticalBasis";
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
	if (!isNumber(a.t) || a.t < 0 || a.t > 1) {
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

/** Validate optional transform fields: `rotation` (number), `flipX`/`flipY`/`lockAspectRatio` (boolean). */
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
	if ("lockAspectRatio" in o && typeof o.lockAspectRatio !== "boolean") {
		errors.push({
			path: `${path}.lockAspectRatio`,
			message: "must be a boolean",
		});
	}
	return errors;
}

/**
 * How one field's value is checked at the doc boundary: the diagnostics the
 * value written at `path` yields, empty when it is admissible.
 */
export type DocFieldValidator = (
	value: unknown,
	path: string,
) => SemanticDiagnostic[];

/**
 * Validator for a value used as a color. Only CSS-injection safety is asked
 * here: whether the string names a color at all needs the browser's parser,
 * which this layer cannot reach, and is asked at the paste boundary instead
 * (`isValidColorValue`).
 */
export const colorValidator: DocFieldValidator = (value, path) =>
	isCssSafeValue(value)
		? []
		: [{ path, message: "must be a safe CSS color value", beyondSchema: true }];

/**
 * Builds a validator for a string inlined into a CSS declaration.
 *
 * @param cssProperty - The property the value lands in ("font-family"), which the diagnostic quotes
 * @returns A validator rejecting anything that could break out of that declaration
 */
export const cssValueValidator =
	(cssProperty: string): DocFieldValidator =>
	(value, path) =>
		isCssSafeValue(value)
			? []
			: [
					{
						path,
						message: `must be a safe CSS ${cssProperty} value`,
						beyondSchema: true,
					},
				];

/**
 * Builds a validator for a numeric field.
 *
 * @param min - Lower bound, inclusive — the schema's `minimum` for the field; omitted leaves the number unbounded
 * @returns A validator rejecting non-numbers ("must be a number") and values below the bound ("must be >= min")
 */
export const numberValidator =
	(min?: number): DocFieldValidator =>
	(value, path) => {
		if (!isNumber(value)) {
			return [{ path, message: "must be a number" }];
		}
		if (min !== undefined && value < min) {
			return [{ path, message: `must be >= ${min}` }];
		}
		return [];
	};

/**
 * Builds a validator for a numeric field bounded at both ends.
 *
 * @param min - Smallest admissible value, inclusive
 * @param max - Largest admissible value, inclusive
 * @returns A validator whose single diagnostic names both ends, a non-number failing it like an out-of-range one
 */
export const numberRangeValidator =
	(min: number, max: number): DocFieldValidator =>
	(value, path) =>
		isNumber(value) && value >= min && value <= max
			? []
			: [{ path, message: `must be a number between ${min} and ${max}` }];

/**
 * Validator for a field written as plain text.
 *
 * @param value - The value written for the field
 * @param path - Diagnostic path of the field
 * @returns One diagnostic for anything but a string
 */
export const stringValidator: DocFieldValidator = (value, path) =>
	isString(value) ? [] : [{ path, message: "must be a string" }];

/**
 * Builds a validator for a field limited to a known set of values.
 *
 * @param isValid - The set's own type guard (`isStrokeDashType`, ...)
 * @param message - Diagnostic text, which spells the admissible values out
 * @returns A validator yielding that one diagnostic when the guard rejects
 */
export const enumValidator =
	(isValid: (value: unknown) => boolean, message: string): DocFieldValidator =>
	(value, path) =>
		isValid(value) ? [] : [{ path, message }];

/**
 * Validates the fields of one group, each against the validator the group's
 * table gives it. The state layer keys a table of its own by the same type, so a
 * field a group gains has to be given a validator on both sides or fails to
 * compile on both (validateStateUtils).
 *
 * @param o - The object carrying the group's fields; keys outside the table are ignored
 * @param path - Diagnostic path of `o`, which each field name is appended to
 * @param validators - The group's table, whose key order the diagnostics follow
 * @returns One diagnostic per malformed field; a field that is absent or `undefined` is unspecified and yields none
 */
export const validateFields = (
	o: Record<string, unknown>,
	path: string,
	validators: Readonly<Record<string, DocFieldValidator>>,
): SemanticDiagnostic[] =>
	Object.entries(validators).flatMap(([key, validate]) =>
		o[key] === undefined ? [] : validate(o[key], `${path}.${key}`),
	);

/** The stroke group's fields, in the order of `STROKE_STYLE_KEYS`. */
const strokeStyleValidators = {
	stroke: colorValidator,
	strokeWidth: numberValidator(STROKE_WIDTH_MIN),
	strokeDashType: enumValidator(
		isStrokeDashType,
		"must be one of: solid, dashed, dotted",
	),
} as const satisfies Record<keyof StrokeStyleDoc, DocFieldValidator>;

/** The fill group's fields, in the order of `FILL_STYLE_KEYS`. */
const fillStyleValidators = {
	fill: colorValidator,
} as const satisfies Record<keyof FillStyleDoc, DocFieldValidator>;

/** The corner-radius group's fields, in the order of `RADIUS_STYLE_KEYS`. */
const radiusStyleValidators = {
	rx: numberValidator(CORNER_RADIUS_MIN),
} as const satisfies Record<keyof RadiusStyleDoc, DocFieldValidator>;

/** The arrowhead group's fields, in the order of `ARROW_STYLE_KEYS`. */
const arrowStyleValidators = {
	startArrow: enumValidator(isArrowType, "must be a valid ArrowType"),
	endArrow: enumValidator(isArrowType, "must be a valid ArrowType"),
} as const satisfies Record<keyof ArrowStyleDoc, DocFieldValidator>;

/**
 * The inline typography, in the order of `TEXT_INLINE_STYLE_KEYS`. Applied to a
 * slot and to every run of its text alike, a run being inlined into the same CSS.
 */
const inlineTextStyleValidators = {
	fontColor: colorValidator,
	fontSize: numberValidator(FONT_SIZE_MIN),
	fontFamily: cssValueValidator("font-family"),
	fontWeight: cssValueValidator("font-weight"),
	fontStyle: cssValueValidator("font-style"),
	textDecoration: cssValueValidator("text-decoration"),
} as const satisfies Record<keyof InlineTextStyle, DocFieldValidator>;

/**
 * A slot's whole styling: the alignment that places the block (and so has no
 * per-run counterpart) before the inline half, so the iteration order matches
 * `TEXT_SLOT_STYLE_KEYS` and, with it, the order the diagnostics come out in.
 */
const textSlotStyleValidators = {
	textAlign: enumValidator(isTextAlign, "must be one of: left, center, right"),
	verticalAlign: enumValidator(
		isVerticalAlign,
		"must be one of: top, middle, bottom",
	),
	...inlineTextStyleValidators,
} as const satisfies Record<keyof TextSlotStyle, DocFieldValidator>;

/** Validate optional stroke style fields: `stroke` (safe CSS color), `strokeWidth` (≥ 0), `strokeDashType`. */
export function validateStrokeStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	return validateFields(o, path, strokeStyleValidators);
}

/** Validate the optional `fill` field as a safe CSS color value. */
export function validateFillStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	return validateFields(o, path, fillStyleValidators);
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
	return validateFields(o, path, textSlotStyleValidators);
}

/**
 * Validate the styling fields that a stretch of characters can carry on its own —
 * everything a slot's typography has except the alignment, which places the whole
 * block. Both a slot and one of its runs (RichText) validate them through here.
 *
 * @param o - The object carrying the styling: a text slot, a single-body doc, or one run
 * @param path - Diagnostic path of `o`, which each field name is appended to
 * @returns One diagnostic per malformed field; empty when every field is absent or valid
 */
export function validateInlineTextStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	return validateFields(o, path, inlineTextStyleValidators);
}

/**
 * Validate one body of text (RichText): the plain string it usually is, or the
 * runs it is written as when parts of it are styled on their own. A run's own
 * styling is validated like a slot's, minus the alignment it cannot carry.
 *
 * @param content - The value written as the text; anything but a string or an array is rejected
 * @param path - Diagnostic path of the text field, which the run index is appended to
 * @returns One diagnostic per malformed run or field; empty when the text is valid
 */
export function validateRichTextContent(
	content: unknown,
	path: string,
): SemanticDiagnostic[] {
	if (isString(content)) {
		return [];
	}
	if (!Array.isArray(content)) {
		return [
			{
				path,
				message: "must be a string, or an array of runs to style parts of it",
			},
		];
	}
	return content.flatMap((run, index) => {
		const runPath = `${path}[${index}]`;
		if (!isObject(run)) {
			return [
				{ path: runPath, message: "must be an object with a text field" },
			];
		}
		return [
			...(isString(run.text)
				? []
				: [{ path: `${runPath}.text`, message: "must be a string" }]),
			...validateInlineTextStyleFields(run, runPath),
		];
	});
}

/**
 * Validate the text group of a single-body doc (features.text: "body"): `text`
 * as one body of text plus the flat styling fields. A keyed object is rejected
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
	if ("text" in o) {
		errors.push(...validateRichTextContent(o.text, `${path}.text`));
	}
	if ("textVerticalBasis" in o && !isTextVerticalBasis(o.textVerticalBasis)) {
		errors.push({
			path: `${path}.textVerticalBasis`,
			message: "must be one of: region, frame",
		});
	}
	errors.push(...validateTextSlotStyleFields(o, path));
	return errors;
}

/** Validate the optional corner-radius field `rx` (≥ 0). */
export function validateRadiusStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	return validateFields(o, path, radiusStyleValidators);
}

/** Validate the optional arrowhead fields as valid ArrowType values. */
export function validateArrowFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	return validateFields(o, path, arrowStyleValidators);
}
