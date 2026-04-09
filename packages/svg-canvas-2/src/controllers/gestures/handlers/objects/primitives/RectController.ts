import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type { MoveByDeltaFunction } from "../../../../../registry/ObjectRegistryTypes";
import type { RectState } from "../../../../../states/objects/primitives/rect/RectState";

/**
 * Moves a Rect object by a delta.
 * Updates cx and cy coordinates.
 */
export const moveByDelta: MoveByDeltaFunction<RectState> = (state, delta) => {
	return {
		...state,
		cx: roundToDecimal(state.cx + delta.x, PRECISION.COORDINATE),
		cy: roundToDecimal(state.cy + delta.y, PRECISION.COORDINATE),
	};
};
