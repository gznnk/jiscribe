import { validateGeometryFields } from "./validateGeometryFields";
import {
	validateArrowFields,
	validateFillStyleFields,
	validateRadiusStyleFields,
	validateStrokeStyleFields,
} from "./validateStyleFields";
import {
	validateSourceTextStyleFields,
	validateTextStyleFields,
} from "./validateTextFields";
import { validateTransformFields } from "./validateTransformFields";
import type { ObjectDocValidateFn } from "../../../plugin/ObjectDocValidateFn";
import type { AutoHeightDeclaration } from "../../../plugin/supportsAutoHeight";
import { supportsAutoHeight } from "../../../plugin/supportsAutoHeight";
import type { ObjectFeatures } from "../types/ObjectFeatures";

/**
 * Builds a doc validator for Frame-based objects (geometry: "rect" | "ellipse"
 * | "point") from features. Composes geometry / transform / stroke / fill / text / radius
 * / arrow according to features, and shape-specific extra checks (such as svg's svgText)
 * are passed via `extra`.
 *
 * Knowledge of which fields to validate lives in the sibling `validate*Fields`
 * helpers; this function is only responsible for calling the right ones per features.
 * Which field *names* the type may hold is not decided here at all — that is the
 * registry's answer, read off the type's definition
 * (`ObjectDocValidatorRegistry.register`), so a validator never carries an
 * allow-list of its own.
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
		...validateGeometryFields(o, path, features.geometry, autoHeight),
		...(features.transform ? validateTransformFields(o, path) : []),
		...(features.stroke ? validateStrokeStyleFields(o, path) : []),
		...(features.fill ? validateFillStyleFields(o, path) : []),
		// "slots" types carry no root text group at all; their closed slot set is
		// theirs to validate, and `extra` is where they do it.
		...(features.text === "body" ? validateTextStyleFields(o, path) : []),
		...(features.text === "source"
			? validateSourceTextStyleFields(o, path)
			: []),
		...(features.radius ? validateRadiusStyleFields(o, path) : []),
		// The mappers pass the arrow group through for any type declaring it
		// (collectStyleKeys), so it must be validated here too — an unchecked
		// startArrow would be persisted and fail only on the next open.
		...(features.arrow ? validateArrowFields(o, path) : []),
		...(extra ? extra(o, path) : []),
	];
};
