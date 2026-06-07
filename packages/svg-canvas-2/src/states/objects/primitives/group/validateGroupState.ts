import { isObject } from "@workspace/basic-validators";

import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import {
	hasValidIdAndType,
	isValidChildIds,
	isValidTransformState,
	type StateRecord,
} from "../../utils/validateStateUtils";

/**
 * GroupState（transform + childIds）を検証する。
 * 境界フレーム（Frame）はキャッシュ値で省略されうるため必須とはしない。
 */
export const isValidGroupState: ObjectStateValidateFn = (value) => {
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
