import { isObject } from "@workspace/basic-validators";

import {
	hasValidIdAndType,
	isValidFillStyleState,
	isValidFrameState,
	isValidRadiusStyleState,
	isValidStrokeStyleState,
	isValidTextStyleState,
	isValidTransformState,
	type StateRecord,
} from "./validateStateUtils";
import type { ObjectFeatures } from "../../../schemas/objects/types/ObjectFeatures";
import type { ObjectStateValidator } from "../../registry/ObjectStateValidatorRegistry";

/**
 * Builds a state validator for Frame-type objects (geometry: "rect" | "ellipse")
 * from its features. Validates id/type, Frame, transform, and stroke/fill/text/radius
 * according to the features. Shape-specific extra validation (e.g. svg's svgText)
 * is passed via `isExtraValid` (a boolean-returning predicate).
 *
 * Since it is a boolean type-guard approach, each check short-circuits with &&.
 */
export const createFrameStateValidator = (
	features: ObjectFeatures,
	isExtraValid?: (o: StateRecord) => boolean,
): ObjectStateValidator => {
	return (value) => {
		if (!isObject(value)) {
			return false;
		}
		const o = value as StateRecord;
		return (
			hasValidIdAndType(o, features.type) &&
			isValidFrameState(o) &&
			(!features.transform || isValidTransformState(o)) &&
			(!features.stroke || isValidStrokeStyleState(o)) &&
			(!features.fill || isValidFillStyleState(o)) &&
			(features.text === undefined ||
				isValidTextStyleState(o, features.text)) &&
			(!features.radius || isValidRadiusStyleState(o)) &&
			(isExtraValid === undefined || isExtraValid(o))
		);
	};
};
