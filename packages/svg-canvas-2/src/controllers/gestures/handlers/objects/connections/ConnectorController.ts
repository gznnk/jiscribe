import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type {
	MoveByDeltaFunction,
	TransformByGroupFunction,
} from "../../../../../registry/ObjectRegistryTypes";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";

/**
 * Moves a Connector object by a delta.
 * Updates all points in the points array.
 */
export const moveByDelta: MoveByDeltaFunction<ConnectorState> = (state, delta) => {
	return {
		...state,
		points: state.points.map((p) => ({
			x: roundToDecimal(p.x + delta.x, PRECISION.COORDINATE),
			y: roundToDecimal(p.y + delta.y, PRECISION.COORDINATE),
		})),
	};
};

/**
 * Transforms a Connector object when its parent group is transformed.
 * TODO: Implement connector-specific transform logic
 */
export const transformByGroup: TransformByGroupFunction<ConnectorState> = (
	state,
	_groupStart,
	_groupEnd,
) => {
	// TODO: Implement connector transform logic
	return state;
};
