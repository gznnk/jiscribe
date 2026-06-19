import { isObject } from "@workspace/basic-validators";

import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import {
	hasValidIdAndType,
	isValidFillStyleState,
	isValidFrameState,
	isValidTextStyleState,
	isValidTransformState,
	type StateRecord,
} from "../../utils/validateStateUtils";

/** StickyState（Frame + transform + fill + text）を検証する。 */
export const isValidStickyState: ObjectStateValidateFn = (value) => {
	if (!isObject(value)) {
		return false;
	}
	const o = value as StateRecord;
	return (
		hasValidIdAndType(o, "sticky") &&
		isValidFrameState(o) &&
		isValidTransformState(o) &&
		isValidFillStyleState(o) &&
		isValidTextStyleState(o)
	);
};
