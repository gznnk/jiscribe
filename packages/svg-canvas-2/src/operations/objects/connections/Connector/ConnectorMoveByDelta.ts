import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../../constants/precision";
import type { MoveByDeltaFunction } from "../../../../registry/ObjectRegistryTypes";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";

/**
 * Moves a Connector object by a delta.
 * Updates all points in the points array.
 */
export const connectorMoveByDelta: MoveByDeltaFunction<ConnectorState> = (state, delta) => {
	return {
		...state,
		points: state.points.map((p) => ({
			x: roundToDecimal(p.x + delta.x, PRECISION.COORDINATE),
			y: roundToDecimal(p.y + delta.y, PRECISION.COORDINATE),
		})),
	};
};
