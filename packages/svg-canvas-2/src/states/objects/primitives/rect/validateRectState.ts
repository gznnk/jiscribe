import { isObject } from "@workspace/basic-validators";

import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import {
	hasValidIdAndType,
	isValidFillStyleState,
	isValidFrameState,
	isValidRadiusStyleState,
	isValidStrokeStyleState,
	isValidTextStyleState,
	isValidTransformState,
	type StateRecord,
} from "../../utils/validateStateUtils";

/** RectState（Frame + transform + stroke + fill + text + radius）を検証する。 */
export const isValidRectState: ObjectStateValidateFn = (value) => {
	if (!isObject(value)) {
		return false;
	}
	const o = value as StateRecord;
	return (
		hasValidIdAndType(o, "rect") &&
		isValidFrameState(o) &&
		isValidTransformState(o) &&
		isValidStrokeStyleState(o) &&
		isValidFillStyleState(o) &&
		isValidTextStyleState(o) &&
		isValidRadiusStyleState(o)
	);
};
