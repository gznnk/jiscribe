import {
	validateFillStyleFields,
	validatePolyFields,
	validateRadiusStyleFields,
	validateRequiredNumber,
	validateStrokeStyleFields,
	validateTextStyleFields,
	validateTransformFields,
} from "./validateDocUtils";
import type { SemanticDiagnostic } from "../../canvas/validators/types";
import type { ObjectDocValidateFn } from "../../registry/ObjectDocValidatorRegistry";
import type { GeometryType } from "../types/GeometryType";
import type { ObjectFeatures } from "../types/ObjectFeatures";

/**
 * The coordinate fields each geometry requires, one entry per GeometryType so
 * that a geometry added to the union has to declare its fields here.
 * `point` stores a position only: its box comes from the content, so the doc
 * has no width/height to check.
 */
const geometryFieldValidators: Record<GeometryType, ObjectDocValidateFn> = {
	none: () => [],
	rect: (o, path) => [
		...validateRequiredNumber(o, path, "x"),
		...validateRequiredNumber(o, path, "y"),
		...validateRequiredNumber(o, path, "width", 0),
		...validateRequiredNumber(o, path, "height", 0),
	],
	ellipse: (o, path) => [
		...validateRequiredNumber(o, path, "cx"),
		...validateRequiredNumber(o, path, "cy"),
		...validateRequiredNumber(o, path, "rx", 0),
		...validateRequiredNumber(o, path, "ry", 0),
	],
	poly: (o, path) => validatePolyFields(o, path),
	point: (o, path) => [
		...validateRequiredNumber(o, path, "x"),
		...validateRequiredNumber(o, path, "y"),
	],
};

/** Validates the required geometry coordinate fields according to features.geometry. */
const validateGeometryFields = (
	o: Record<string, unknown>,
	path: string,
	features: ObjectFeatures,
): SemanticDiagnostic[] => geometryFieldValidators[features.geometry](o, path);

/**
 * Builds a doc validator for Frame-based objects (geometry: "rect" | "ellipse"
 * | "point") from features. Composes geometry / transform / stroke / fill / text / radius
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
		// "slots" types carry no root text group at all; their closed slot set is
		// theirs to validate, and `extra` is where they do it.
		...(features.text === "body" ? validateTextStyleFields(o, path) : []),
		...(features.radius ? validateRadiusStyleFields(o, path) : []),
		...(extra ? extra(o, path) : []),
	];
