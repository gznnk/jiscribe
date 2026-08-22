import {
	validateArrowFields,
	validateFillStyleFields,
	validateOptionalNumber,
	validatePolyFields,
	validateRadiusStyleFields,
	validateRequiredNumber,
	validateStrokeStyleFields,
	validateTextStyleFields,
	validateTransformFields,
} from "./validateDocUtils";
import type { ObjectDocValidateFn } from "../../../plugin/ObjectDocValidatorRegistry";
import type { AutoHeightDeclaration } from "../../../plugin/supportsAutoHeight";
import { supportsAutoHeight } from "../../../plugin/supportsAutoHeight";
import type { SemanticDiagnostic } from "../../types/SemanticDiagnostic";
import type { GeometryType } from "../types/GeometryType";
import type { ObjectFeatures } from "../types/ObjectFeatures";

/** A geometry's coordinate check, told whether this type may leave `height` out. */
type GeometryFieldValidator = (
	o: Record<string, unknown>,
	path: string,
	autoHeight: boolean,
) => SemanticDiagnostic[];

/**
 * The coordinate fields each geometry requires, one entry per GeometryType so
 * that a geometry added to the union has to declare its fields here.
 * `point` stores a position only: its box comes from the content, so the doc
 * has no width/height to check.
 */
const geometryFieldValidators: Record<GeometryType, GeometryFieldValidator> = {
	none: () => [],
	rect: (o, path, autoHeight) => [
		...validateRequiredNumber(o, path, "x"),
		...validateRequiredNumber(o, path, "y"),
		...validateRequiredNumber(o, path, "width", 0),
		// A type whose box holds its text may leave the height out, the height then
		// following the text (see supportsAutoHeight); every other type owes one.
		...(autoHeight
			? validateOptionalNumber(o, path, "height", 0)
			: validateRequiredNumber(o, path, "height", 0)),
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
	autoHeight: boolean,
): SemanticDiagnostic[] =>
	geometryFieldValidators[features.geometry](o, path, autoHeight);

/**
 * Builds a doc validator for Frame-based objects (geometry: "rect" | "ellipse"
 * | "point") from features. Composes geometry / transform / stroke / fill / text / radius
 * / arrow according to features, and shape-specific extra checks (such as svg's svgText)
 * are passed via `extra`.
 *
 * Knowledge of which fields to validate lives in the validateDocUtils builders;
 * this function is only responsible for calling the right builders per features.
 *
 * @param features - Geometry kind and capability flags; decides which builders run
 * @param extra - Shape-specific checks, run after the ones features imply
 * @param declaration - The type's `textRegion` and `autoHeight`, which are what
 *   decide whether its `height` may be left out (see `supportsAutoHeight`). Pass
 *   the very pair the definition carries; omitting it keeps `height` required
 */
export const createFrameDocValidator = (
	features: ObjectFeatures,
	extra?: ObjectDocValidateFn,
	declaration?: Omit<AutoHeightDeclaration, "features">,
): ObjectDocValidateFn => {
	const autoHeight = supportsAutoHeight({ features, ...declaration });
	return (o, path) => [
		...validateGeometryFields(o, path, features, autoHeight),
		...(features.transform ? validateTransformFields(o, path) : []),
		...(features.stroke ? validateStrokeStyleFields(o, path) : []),
		...(features.fill ? validateFillStyleFields(o, path) : []),
		// "slots" types carry no root text group at all; their closed slot set is
		// theirs to validate, and `extra` is where they do it.
		...(features.text === "body" ? validateTextStyleFields(o, path) : []),
		...(features.radius ? validateRadiusStyleFields(o, path) : []),
		// The mappers pass the arrow group through for any type declaring it
		// (collectStyleKeys), so it must be validated here too — an unchecked
		// startArrow would be persisted and fail only on the next open.
		...(features.arrow ? validateArrowFields(o, path) : []),
		...(extra ? extra(o, path) : []),
	];
};
