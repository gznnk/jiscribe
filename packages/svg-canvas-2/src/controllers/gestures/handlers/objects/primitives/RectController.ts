import { roundToDecimal } from "@workspace/geometry";

import { transformFrameByGroup } from "../base/FrameTransform";
import { PRECISION } from "../../../../../constants/precision";
import type {
	MoveByDeltaFunction,
	TransformByGroupFunction,
} from "../../../../../registry/ObjectRegistryTypes";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
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

/**
 * Transforms a Rect object when its parent group is transformed.
 */
export const transformByGroup: TransformByGroupFunction<RectState> = (
	state,
	groupStart,
	groupEnd,
) => {
	return transformFrameByGroup(
		state,
		groupStart as GroupState,
		groupEnd as GroupState,
	);
};
