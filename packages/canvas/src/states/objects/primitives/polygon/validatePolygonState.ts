import { isObject } from "@workspace/basic-validators";

import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import {
	hasValidIdAndType,
	isValidFillStyleState,
	isValidPolyState,
	isValidStrokeStyleState,
	type StateRecord,
} from "../../utils/validateStateUtils";

/** PolygonState（Poly + stroke + fill）を検証する。 */
export const isValidPolygonState: ObjectStateValidateFn = (value) => {
	if (!isObject(value)) {
		return false;
	}
	const o = value as StateRecord;
	return (
		hasValidIdAndType(o, "polygon") &&
		isValidPolyState(o) &&
		isValidStrokeStyleState(o) &&
		isValidFillStyleState(o)
	);
};
