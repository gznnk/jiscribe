import {
	isArray,
	isCssSafeValue,
	isNumber,
	isString,
} from "@workspace/basic-validators";

import { isArrowType } from "../../../schemas/objects/types/ArrowType";
import { isOwnedEndpointRef } from "../../../schemas/objects/types/EndpointRef";
import type { ObjectType } from "../../../schemas/objects/types/ObjectType";
import { isPoly } from "../../../schemas/objects/types/Poly";
import { isStrokeDashType } from "../../../schemas/objects/types/StrokeDashType";
import { validateEndpointRef } from "../../../schemas/objects/utils/validateDocUtils";
import { isTextStyleState } from "../base/TextStyleState";
import { isTransformState } from "../base/TransformState";

/**
 * Shared helpers for validating clipboard-derived `ObjectState` (= arbitrary untrusted objects)
 * by type. They use the type-guard style returning boolean, consistent with the state layer's
 * existing guards (`isTransformState` / `isTextStyleState` / `isGroupState`, etc.).
 *
 * Step 1's `isCssSafeValue` is applied to style strings (stroke / fill / fontFamily / fontWeight)
 * to reject CSS injection at the boundary. Strict color validity (`isCssColor` = `CSS.supports`)
 * is browser-only and is left to `isTextStyleState`.
 */
export type StateRecord = Record<string, unknown>;

/**
 * Validates a required numeric field: it must be a number and, when `min` is given, meet the lower bound.
 * The lower bound corresponds to the schema's `minimum` constraint (width/height/radius ≥ 0, etc.).
 * The boolean version of the Doc-side `validateRequiredNumber` (validateDocUtils).
 */
const isValidRequiredNumber = (value: unknown, min?: number): boolean =>
	isNumber(value) && (min === undefined || value >= min);

/**
 * Validates an optional numeric field. Absence (undefined) is not an error;
 * number / lower bound is validated only when present. The boolean version of the Doc-side `validateOptionalNumber`.
 */
const isValidOptionalNumber = (value: unknown, min?: number): boolean =>
	value === undefined || isValidRequiredNumber(value, min);

/** Validates that id is a non-empty string and type matches the expected value. */
export const hasValidIdAndType = (o: StateRecord, type: ObjectType): boolean =>
	isString(o.id) && o.id.length > 0 && o.type === type;

/**
 * Validates Frame geometry (cx / cy / width / height are numbers).
 * width / height have minimum: 0 in the schema (positions cx / cy have no lower bound).
 */
export const isValidFrameState = (o: StateRecord): boolean =>
	isNumber(o.cx) &&
	isNumber(o.cy) &&
	isValidRequiredNumber(o.width, 0) &&
	isValidRequiredNumber(o.height, 0);

/**
 * Validates Poly geometry (the points array). `minPoints` is the minimum point count,
 * corresponding to minPoints of the Doc-side `validatePolyFields` (polyline: 2 / polygon: 3).
 */
export const isValidPolyState = (o: StateRecord, minPoints: number): boolean =>
	isPoly(o) && o.points.length >= minPoints;

/**
 * Validates a connector's intermediate waypoints. Since the endpoints are held by source / target,
 * points holds only waypoints, and an empty array is allowed too (corresponds to the Doc-side `validateWaypointFields`).
 */
export const isValidWaypointState = (o: StateRecord): boolean => isPoly(o);

/**
 * Connector invariant: at least one endpoint must be owned.
 * Both ends free (no owner) is equivalent to ink(polyline) and invalid as a connector.
 * Corresponds to the same-named rule in the Doc-side `validateConnectorDoc`.
 */
export const hasOwnedEndpoint = (source: unknown, target: unknown): boolean =>
	isOwnedEndpointRef(source) || isOwnedEndpointRef(target);

/** Validates TransformState (rotation / scaleX / scaleY are numbers). */
export const isValidTransformState = (o: StateRecord): boolean =>
	isTransformState(o);

/** Validates StrokeStyleState's optional fields for type/safety when present. */
export const isValidStrokeStyleState = (o: StateRecord): boolean => {
	if ("stroke" in o && o.stroke !== undefined && !isCssSafeValue(o.stroke)) {
		return false;
	}
	// strokeWidth has minimum: 0 in the schema
	if (!isValidOptionalNumber(o.strokeWidth, 0)) {
		return false;
	}
	if (
		"strokeDashType" in o &&
		o.strokeDashType !== undefined &&
		!isStrokeDashType(o.strokeDashType)
	) {
		return false;
	}
	return true;
};

/** Validates FillStyleState's fill for CSS safety when present. */
export const isValidFillStyleState = (o: StateRecord): boolean =>
	!("fill" in o) || o.fill === undefined || isCssSafeValue(o.fill);

/**
 * In addition to TextStyleState validity, validates the CSS-injection safety of
 * fontFamily / fontWeight (supplementing `isTextStyleState`, which only checks both via `isString`).
 */
export const isValidTextStyleState = (o: StateRecord): boolean => {
	if (!isTextStyleState(o)) {
		return false;
	}
	if (
		"fontFamily" in o &&
		o.fontFamily !== undefined &&
		!isCssSafeValue(o.fontFamily)
	) {
		return false;
	}
	if (
		"fontWeight" in o &&
		o.fontWeight !== undefined &&
		!isCssSafeValue(o.fontWeight)
	) {
		return false;
	}
	// fontSize has minimum: 1 in the schema (isTextStyleState only checks up to number)
	if (!isValidOptionalNumber(o.fontSize, 1)) {
		return false;
	}
	return true;
};

/** Validates RadiusStyleState's rx as a number (minimum: 0 in the schema) when present. */
export const isValidRadiusStyleState = (o: StateRecord): boolean =>
	isValidOptionalNumber(o.rx, 0);

/** Validates arrow ends (startArrow / endArrow) as ArrowType when present. */
export const isValidArrowFields = (o: StateRecord): boolean => {
	if (
		"startArrow" in o &&
		o.startArrow !== undefined &&
		!isArrowType(o.startArrow)
	) {
		return false;
	}
	if ("endArrow" in o && o.endArrow !== undefined && !isArrowType(o.endArrow)) {
		return false;
	}
	return true;
};

/**
 * Validates that childIds is a non-empty array of strings.
 * An empty group is a degenerate state where bounds are undefined, and creation paths always
 * produce children, so an empty array is treated as corruption and rejected (corresponds to the
 * empty-children rejection in the Doc-side validateStructure).
 * Whether the child IDs actually exist in `objects` (self-containedness) is cross-validated by isClipboardData.
 */
export const isValidChildIds = (o: StateRecord): boolean =>
	isArray(o.childIds) && o.childIds.length > 0 && o.childIds.every(isString);

/** Validates that a connector's endpoint reference (EndpointRef) is valid. */
export const isValidEndpointRefState = (ref: unknown): boolean =>
	validateEndpointRef(ref, "").length === 0;
