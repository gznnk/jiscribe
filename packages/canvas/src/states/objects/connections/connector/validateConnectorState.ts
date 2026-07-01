import { isNumber, isObject, isString } from "@workspace/basic-validators";

import { isConnectorRouting } from "../../../../schemas/objects/types/ConnectorRouting";
import { isStrokeDashType } from "../../../../schemas/objects/types/StrokeDashType";
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
 * Validates the structure of `label` (a nested annotation). Omitting it is
 * allowed and treated as no label. `text` is a required string; position and
 * style fields are type-checked only when present.
 */
export const isValidConnectorLabelState = (label: unknown): boolean => {
	if (label === undefined) {
		return true;
	}
	if (!isObject(label)) {
		return false;
	}
	const l = label as StateRecord;
	return (
		isString(l.text) &&
		(l.position === undefined || isNumber(l.position)) &&
		(l.offset === undefined || isNumber(l.offset)) &&
		(l.fontColor === undefined || isString(l.fontColor)) &&
		(l.fontSize === undefined || isNumber(l.fontSize)) &&
		(l.fontWeight === undefined || isString(l.fontWeight)) &&
		(l.fill === undefined || isString(l.fill)) &&
		(l.stroke === undefined || isString(l.stroke)) &&
		(l.strokeWidth === undefined || isNumber(l.strokeWidth)) &&
		(l.strokeDashType === undefined || isStrokeDashType(l.strokeDashType))
	);
};

/**
 * Validates a ConnectorState (waypoints + stroke + arrow ends + source/target
 * endpoints). `points` holds only intermediate waypoints while the endpoints
 * are held by source/target, so an empty array is allowed; the invariant
 * requires at least one of the endpoints to be owned.
 */
export const isValidConnectorState: ObjectStateValidateFn = (value) => {
	if (!isObject(value)) {
		return false;
	}
	const o = value as StateRecord;
	return (
		hasValidIdAndType(o, "connector") &&
		// routing is optional. When specified, only known values (straight | orthogonal) are allowed.
		(o.routing === undefined || isConnectorRouting(o.routing)) &&
		isValidWaypointState(o) &&
		isValidStrokeStyleState(o) &&
		isValidArrowFields(o) &&
		isValidConnectorLabelState(o.label) &&
		isObject(o.source) &&
		isObject(o.target) &&
		isValidEndpointRefState(o.source) &&
		isValidEndpointRefState(o.target) &&
		hasOwnedEndpoint(o.source, o.target)
	);
};
