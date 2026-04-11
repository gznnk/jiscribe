import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type {
	MoveByDeltaFunction,
	RotateByGroupFunction,
	TransformByGroupFunction,
} from "../../../../../registry/ObjectRegistryTypes";
import type { StickyState } from "../../../../../states/objects/annotations/sticky/StickyState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import {
	transformFrameByGroup,
	rotateFrameByGroup,
} from "../base/FrameTransform";

/**
 * Moves a Sticky object by a delta.
 * Updates cx and cy coordinates.
 */
export const moveByDelta: MoveByDeltaFunction<StickyState> = (state, delta) => {
	return {
		...state,
		cx: roundToDecimal(state.cx + delta.x, PRECISION.COORDINATE),
		cy: roundToDecimal(state.cy + delta.y, PRECISION.COORDINATE),
	};
};

/**
 * Transforms a Sticky object when its parent group is transformed.
 */
export const transformByGroup: TransformByGroupFunction<StickyState> = (
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
 * Rotates a Sticky object when its parent group is rotated.
 */
export const rotateByGroup: RotateByGroupFunction<StickyState> = (
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
