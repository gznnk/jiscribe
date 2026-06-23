import { isObject } from "@workspace/basic-validators";

import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import {
	hasValidIdAndType,
	isValidArrowFields,
	isValidPolyState,
	isValidStrokeStyleState,
	type StateRecord,
} from "../../utils/validateStateUtils";

/** PolylineState（Poly + stroke + 矢印端）を検証する。 */
export const isValidPolylineState: ObjectStateValidateFn = (value) => {
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
