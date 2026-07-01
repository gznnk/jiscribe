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
 * label（ネストした注記）の構造を検証する。未指定はラベル無しとして許容する。
 * text は string 必須、位置・スタイルは存在時のみ型を確認する。
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
		isValidConnectorLabelState(o.label) &&
		isObject(o.source) &&
		isObject(o.target) &&
		isValidEndpointRefState(o.source) &&
		isValidEndpointRefState(o.target) &&
		hasOwnedEndpoint(o.source, o.target)
	);
};
