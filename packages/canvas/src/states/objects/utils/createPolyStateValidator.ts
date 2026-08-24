import { isObject } from "@jiscribe/basic-validators";
import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";

import {
	hasValidIdAndType,
	isValidArrowFields,
	isValidFillStyleState,
	isValidPolyState,
	isValidRadiusStyleState,
	isValidStrokeStyleState,
	isValidTextStyleState,
	isValidTransformState,
	type StateRecord,
} from "./validateStateUtils";
import type { ObjectStateValidator } from "../../registry/ObjectStateValidatorRegistry";

/**
 * Builds a state validator for Poly-family objects (geometry: "poly") from its
 * features — the Poly counterpart to `createFrameStateValidator`, and the
 * validator-side counterpart to `createPolyMapper`: the mapper passes every
 * style group enabled in `features` through, so deriving the validator from the
 * same descriptor keeps a feature added later from flowing through the mapper
 * while silently skipping state validation.
 *
 * Validates id/type, the points array, and transform/stroke/fill/text/radius/arrow
 * according to the features. Shape-specific extra validation (a connector's
 * endpoints / label / routing) is passed via `isExtraValid`.
 *
 * Since it is a boolean type-guard approach, each check short-circuits with &&.
 *
 * @param features - Feature descriptor of the type being validated; its `geometry`
 *   must be "poly"
 * @param minPoints - Minimum length of `points`, matching the type's Doc-side rule
 *   (polygon: 3 / polyline: 2 / connector: 0, whose points are waypoints only)
 * @param isExtraValid - Shape-specific checks beyond the feature groups
 */
export const createPolyStateValidator = (
	features: ObjectFeatures & { geometry: "poly" },
	minPoints: number,
	isExtraValid?: (o: StateRecord) => boolean,
): ObjectStateValidator => {
	return (value) => {
		if (!isObject(value)) {
			return false;
		}
		const o = value as StateRecord;
		return (
			hasValidIdAndType(o, features.type) &&
			isValidPolyState(o, minPoints) &&
			(!features.transform || isValidTransformState(o)) &&
			(!features.stroke || isValidStrokeStyleState(o)) &&
			(!features.fill || isValidFillStyleState(o)) &&
			(features.text === undefined ||
				isValidTextStyleState(o, features.text)) &&
			(!features.radius || isValidRadiusStyleState(o)) &&
			(!features.arrow || isValidArrowFields(o)) &&
			(isExtraValid === undefined || isExtraValid(o))
		);
	};
};
