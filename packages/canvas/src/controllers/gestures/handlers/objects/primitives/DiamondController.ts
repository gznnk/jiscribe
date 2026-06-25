import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type { DiamondState } from "../../../../../states/objects/primitives/diamond/DiamondState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
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
 * Moves a Diamond object by a delta.
 * Updates cx and cy coordinates.
 */
export const moveByDelta: MoveByDeltaFunction<DiamondState> = (
	state,
	delta,
) => {
	return {
		...state,
		cx: roundToDecimal(state.cx + delta.x, PRECISION.COORDINATE),
		cy: roundToDecimal(state.cy + delta.y, PRECISION.COORDINATE),
	};
};

/**
 * Transforms a Diamond object when its parent group is transformed.
 */
export const transformByGroup: TransformByGroupFunction<DiamondState> = (
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
 * Rotates a Diamond object when its parent group is rotated.
 */
export const rotateByGroup: RotateByGroupFunction<DiamondState> = (
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
