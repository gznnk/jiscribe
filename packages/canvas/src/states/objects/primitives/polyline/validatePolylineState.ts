import { isObject } from "@workspace/basic-validators";

import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import {
	hasValidIdAndType,
	isValidArrowFields,
	isValidPolyState,
	isValidStrokeStyleState,
	type StateRecord,
} from "../../utils/validateStateUtils";

/** Validates PolylineState (Poly + stroke + arrow endpoints). */
export const isValidPolylineState: ObjectStateValidator = (value) => {
	if (!isObject(value)) {
		return false;
	}
	const o = value as StateRecord;
	return (
		hasValidIdAndType(o, "polyline") &&
		isValidPolyState(o, 2) &&
		isValidStrokeStyleState(o) &&
		isValidArrowFields(o)
	);
};
