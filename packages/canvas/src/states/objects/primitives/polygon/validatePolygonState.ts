import { isObject } from "@workspace/basic-validators";

import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import {
	hasValidIdAndType,
	isValidFillStyleState,
	isValidPolyState,
	isValidStrokeStyleState,
	type StateRecord,
} from "../../utils/validateStateUtils";

/**
 * PolygonState（Poly + stroke + fill）を検証する。
 * polygon は閉じた多角形のため最低 3 点必要（polyline の 2 点とは異なる）。
 */
export const isValidPolygonState: ObjectStateValidateFn = (value) => {
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
