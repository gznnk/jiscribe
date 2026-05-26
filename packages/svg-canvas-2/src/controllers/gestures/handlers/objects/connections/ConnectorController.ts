import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import type {
	MoveByDeltaFunction,
	RotateByGroupFunction,
	TransformByGroupFunction,
} from "../../../registry/ObjectBehaviorTypes";

/**
 * Moves a Connector object by a delta.
 * Updates all points in the points array.
 */
export const moveByDelta: MoveByDeltaFunction<ConnectorState> = (
	state,
	delta,
) => {
	return {
		...state,
		points: state.points.map((p) => ({
			x: roundToDecimal(p.x + delta.x, PRECISION.COORDINATE),
			y: roundToDecimal(p.y + delta.y, PRECISION.COORDINATE),
		})),
	};
};

/**
 * No-op: connectors cannot be added to groups via the UI (exclusive selection),
 * so this function is never reached in practice.
 */
export const transformByGroup: TransformByGroupFunction<ConnectorState> = (
	state,
	_groupStart,
	_groupEnd,
) => state;

/**
 * No-op: connectors cannot be added to groups via the UI (exclusive selection),
 * so this function is never reached in practice.
 */
export const rotateByGroup: RotateByGroupFunction<ConnectorState> = (
	state,
	_rotationRootGroup,
	_endGroupRotation,
) => state;
