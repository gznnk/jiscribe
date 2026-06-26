import { isObject } from "@workspace/basic-validators";

import { isConnectorRouting } from "../../../../schemas/objects/types/ConnectorRouting";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import {
	hasOwnedEndpoint,
	hasValidIdAndType,
	isValidArrowFields,
	isValidEndpointRefState,
	isValidStrokeStyleState,
	isValidWaypointState,
	type StateRecord,
} from "../../utils/validateStateUtils";

/**
 * ConnectorState（waypoint + stroke + 矢印端 + source/target 端点）を検証する。
 * points は中間経由点のみで端点は source/target が持つため空配列を許容し、
 * 不変条件として少なくとも一方の端点が owned であることを要求する。
 */
export const isValidConnectorState: ObjectStateValidateFn = (value) => {
	if (!isObject(value)) {
		return false;
	}
	const o = value as StateRecord;
	return (
		hasValidIdAndType(o, "connector") &&
		// routing は任意。指定する場合は既知の値（straight | orthogonal）のみ許容する。
		(o.routing === undefined || isConnectorRouting(o.routing)) &&
		isValidWaypointState(o) &&
		isValidStrokeStyleState(o) &&
		isValidArrowFields(o) &&
		isObject(o.source) &&
		isObject(o.target) &&
		isValidEndpointRefState(o.source) &&
		isValidEndpointRefState(o.target) &&
		hasOwnedEndpoint(o.source, o.target)
	);
};
