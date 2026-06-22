import { isNumber, isObject, isString } from "@workspace/basic-validators";

import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import {
	hasValidIdAndType,
	isValidFrameState,
	isValidTransformState,
	type StateRecord,
} from "../../utils/validateStateUtils";

/** SvgState（Frame + transform + svgText + naturalWidth/Height）を検証する。 */
export const isValidSvgState: ObjectStateValidateFn = (value) => {
	if (!isObject(value)) {
		return false;
	}
	const o = value as StateRecord;
	return (
		hasValidIdAndType(o, "svg") &&
		isValidFrameState(o) &&
		isValidTransformState(o) &&
		isString(o.svgText) &&
		isNumber(o.naturalWidth) &&
		isNumber(o.naturalHeight)
	);
};
