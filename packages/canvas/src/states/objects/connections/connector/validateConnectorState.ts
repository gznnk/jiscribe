import { isObject } from "@workspace/basic-validators";

import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import {
	hasValidIdAndType,
	isValidArrowFields,
	isValidEndpointRefState,
	isValidPolyState,
	isValidStrokeStyleState,
	type StateRecord,
} from "../../utils/validateStateUtils";

/** ConnectorState（Poly + stroke + 矢印端 + source/target 端点）を検証する。 */
export const isValidConnectorState: ObjectStateValidateFn = (value) => {
	if (!isObject(value)) {
		return false;
	}
	const o = value as StateRecord;
	return (
		hasValidIdAndType(o, "connector") &&
		isValidPolyState(o) &&
		isValidStrokeStyleState(o) &&
		isValidArrowFields(o) &&
		isObject(o.source) &&
		isObject(o.target) &&
		isValidEndpointRefState(o.source) &&
		isValidEndpointRefState(o.target)
	);
};
