import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type {
	MoveByDeltaFunction,
	RotateByGroupFunction,
	TransformByGroupFunction,
} from "../../../../../registry/ObjectRegistryTypes";
import type { EllipseState } from "../../../../../states/objects/primitives/ellipse/EllipseState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import { transformFrameByGroup, rotateFrameByGroup } from "../base/FrameTransform";

/**
 * Moves an Ellipse object by a delta.
 * Updates cx and cy coordinates.
 */
export const moveByDelta: MoveByDeltaFunction<EllipseState> = (state, delta) => {
	return {
		...state,
		cx: roundToDecimal(state.cx + delta.x, PRECISION.COORDINATE),
		cy: roundToDecimal(state.cy + delta.y, PRECISION.COORDINATE),
	};
};

/**
 * Transforms an Ellipse object when its parent group is transformed.
 */
export const transformByGroup: TransformByGroupFunction<EllipseState> = (
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
 * Rotates an Ellipse object when its parent group is rotated.
 */
export const rotateByGroup: RotateByGroupFunction<EllipseState> = (
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
