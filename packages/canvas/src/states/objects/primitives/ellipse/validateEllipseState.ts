import { isObject } from "@workspace/basic-validators";

import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import {
	hasValidIdAndType,
	isValidFillStyleState,
	isValidFrameState,
	isValidStrokeStyleState,
	isValidTextStyleState,
	isValidTransformState,
	type StateRecord,
} from "../../utils/validateStateUtils";

/** EllipseState（Frame + transform + stroke + fill + text）を検証する。 */
export const isValidEllipseState: ObjectStateValidateFn = (value) => {
	if (!isObject(value)) {
		return false;
	}
	const o = value as StateRecord;
	return (
		hasValidIdAndType(o, "ellipse") &&
		isValidFrameState(o) &&
		isValidTransformState(o) &&
		isValidStrokeStyleState(o) &&
		isValidFillStyleState(o) &&
		isValidTextStyleState(o)
	);
};
