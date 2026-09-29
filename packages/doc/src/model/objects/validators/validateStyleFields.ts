import type { DocFieldValidator } from "./fieldValidators";
import {
	colorValidator,
	enumValidator,
	numberRangeValidator,
	numberValidator,
	validateFields,
} from "./fieldValidators";
import type { SemanticDiagnostic } from "../../types/SemanticDiagnostic";
import type { ArrowStyleDoc } from "../base/ArrowStyleDoc";
import type { FillStyleDoc } from "../base/FillStyleDoc";
import type { RadiusStyleDoc } from "../base/RadiusStyleDoc";
import { CORNER_RADIUS_MIN } from "../base/RadiusStyleDoc";
import type { StrokeStyleDoc } from "../base/StrokeStyleDoc";
import { STROKE_WIDTH_MIN } from "../base/StrokeStyleDoc";
import { isArrowType } from "../types/ArrowType";
import { isStrokeDashType } from "../types/StrokeDashType";
import { OPACITY_MAX, OPACITY_MIN } from "../utils/opacity";

/** The stroke group's fields, in the order of `STROKE_STYLE_KEYS`. */
const strokeStyleValidators = {
	stroke: colorValidator,
	strokeWidth: numberValidator(STROKE_WIDTH_MIN),
	strokeDashType: enumValidator(
		isStrokeDashType,
		"must be one of: solid, dashed, dotted",
	),
	strokeOpacity: numberRangeValidator(OPACITY_MIN, OPACITY_MAX),
} as const satisfies Record<keyof StrokeStyleDoc, DocFieldValidator>;

/** The fill group's fields, in the order of `FILL_STYLE_KEYS`. */
const fillStyleValidators = {
	fill: colorValidator,
	fillOpacity: numberRangeValidator(OPACITY_MIN, OPACITY_MAX),
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
