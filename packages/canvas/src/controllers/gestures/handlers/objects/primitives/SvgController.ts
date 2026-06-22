import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import type { SvgState } from "../../../../../states/objects/primitives/svg/SvgState";
import type {
	MoveByDeltaFunction,
	RotateByGroupFunction,
	TransformByGroupFunction,
} from "../../../registry/ObjectBehaviorTypes";
import {
	transformFrameByGroup,
	rotateFrameByGroup,
} from "../base/FrameTransform";

/**
 * Moves a Svg object by a delta.
 * Updates cx and cy coordinates.
 */
export const moveByDelta: MoveByDeltaFunction<SvgState> = (state, delta) => {
	return {
		...state,
		cx: roundToDecimal(state.cx + delta.x, PRECISION.COORDINATE),
		cy: roundToDecimal(state.cy + delta.y, PRECISION.COORDINATE),
	};
};

/**
 * Transforms a Svg object when its parent group is transformed.
 */
export const transformByGroup: TransformByGroupFunction<SvgState> = (
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

/**
 * Rotates a Svg object when its parent group is rotated.
 */
export const rotateByGroup: RotateByGroupFunction<SvgState> = (
	state,
	rotationRootGroup,
	endGroupRotation,
) => {
	return rotateFrameByGroup(
		state,
		rotationRootGroup as GroupState,
		endGroupRotation,
	);
};
