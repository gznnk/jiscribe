import { isObject } from "@workspace/basic-validators";

import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import {
	hasValidIdAndType,
	isValidChildIds,
	isValidTransformState,
	type StateRecord,
} from "../../utils/validateStateUtils";

/**
 * Validates a GroupState (transform + childIds).
 * The bounding frame (Frame) may be omitted as a cached value, so it is not required.
 */
export const isValidGroupState: ObjectStateValidator = (value) => {
	if (!isObject(value)) {
		return false;
	}
	const o = value as StateRecord;
	return (
		hasValidIdAndType(o, "group") &&
		isValidTransformState(o) &&
		isValidChildIds(o)
	);
};
