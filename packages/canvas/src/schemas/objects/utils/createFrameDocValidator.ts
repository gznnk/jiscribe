import {
	validateFillStyleFields,
	validateRadiusStyleFields,
	validateRequiredNumber,
	validateStrokeStyleFields,
	validateTextStyleFields,
	validateTransformFields,
} from "./validateDocUtils";
import type { SemanticDiagnostic } from "../../canvas/validators/types";
import type { ObjectDocValidateFn } from "../../registry/ObjectDocValidatorRegistry";
import type { ObjectFeatures } from "../types/ObjectFeatures";

/** Validates the required geometry coordinate fields according to features.geometry. */
const validateGeometryFields = (
	o: Record<string, unknown>,
	path: string,
	features: ObjectFeatures,
): SemanticDiagnostic[] =>
	features.geometry === "ellipse"
		? [
				...validateRequiredNumber(o, path, "cx"),
				...validateRequiredNumber(o, path, "cy"),
				...validateRequiredNumber(o, path, "rx", 0),
				...validateRequiredNumber(o, path, "ry", 0),
			]
		: [
				...validateRequiredNumber(o, path, "x"),
				...validateRequiredNumber(o, path, "y"),
				...validateRequiredNumber(o, path, "width", 0),
				...validateRequiredNumber(o, path, "height", 0),
			];

/**
 * Builds a doc validator for Frame-based objects (geometry: "rect" | "ellipse")
 * from features. Composes geometry / transform / stroke / fill / text / radius
 * according to features, and shape-specific extra checks (such as svg's svgText)
 * are passed via `extra`.
 *
 * Knowledge of which fields to validate lives in the validateDocUtils builders;
 * this function is only responsible for calling the right builders per features.
 */
export const createFrameDocValidator =
	(
		features: ObjectFeatures,
		extra?: ObjectDocValidateFn,
	): ObjectDocValidateFn =>
	(o, path) => [
		...validateGeometryFields(o, path, features),
		...(features.transform ? validateTransformFields(o, path) : []),
		...(features.stroke ? validateStrokeStyleFields(o, path) : []),
		...(features.fill ? validateFillStyleFields(o, path) : []),
		...(features.text ? validateTextStyleFields(o, path) : []),
		...(features.radius ? validateRadiusStyleFields(o, path) : []),
		...(extra ? extra(o, path) : []),
	];
