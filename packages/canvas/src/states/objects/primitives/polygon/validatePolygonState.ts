import { isObject } from "@jiscribe/basic-validators";

import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import {
	hasValidIdAndType,
	isValidFillStyleState,
	isValidPolyState,
	isValidStrokeStyleState,
	type StateRecord,
} from "../../utils/validateStateUtils";

/**
 * Validates a PolygonState (Poly + stroke + fill).
 * A polygon is a closed shape, so it requires at least 3 points (unlike a polyline's 2).
 */
export const isValidPolygonState: ObjectStateValidator = (value) => {
	if (!isObject(value)) {
		return false;
	}
	const o = value as StateRecord;
	return (
		hasValidIdAndType(o, "polygon") &&
		isValidPolyState(o, 3) &&
		isValidStrokeStyleState(o) &&
		isValidFillStyleState(o)
	);
};
