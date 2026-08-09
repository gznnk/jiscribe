import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../constants/precision";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { TextState } from "../../../states/objects/primitives/text/TextState";
import type {
	MoveByDeltaFunction,
	RotateByGroupFunction,
	TransformByGroupFunction,
} from "../../gestures/registry/ObjectBehaviorTypes";
import {
	rotateFrameByGroup,
	transformFrameByGroup,
} from "../base/FrameTransform";

/** Moves a text object by a delta. Same as any Frame shape: the center is translated. */
export const moveByDelta: MoveByDeltaFunction<TextState> = (state, delta) => ({
	...state,
	cx: roundToDecimal(state.cx + delta.x, PRECISION.COORDINATE),
	cy: roundToDecimal(state.cy + delta.y, PRECISION.COORDINATE),
});

/**
 * Places a text object when its parent group is transformed, taking the position
 * the shared Frame math produces but keeping the box it already has: the size is
 * measured from the text, so scaling it would only make the box disagree with
 * what is drawn inside it.
 */
export const transformByGroup: TransformByGroupFunction<TextState> = (
	state,
	groupStart,
	groupEnd,
) => {
	const transformed = transformFrameByGroup(
		state,
		groupStart as GroupState,
		groupEnd as GroupState,
	);
	return { ...transformed, width: state.width, height: state.height };
};

/**
 * Rotates a text object when its parent group is rotated. Unrestricted, unlike
 * the size: rotation is stored in the doc, so the result survives a reload.
 */
export const rotateByGroup: RotateByGroupFunction<TextState> = (
	state,
	rotationRootGroup,
	endGroupRotation,
) =>
	rotateFrameByGroup(state, rotationRootGroup as GroupState, endGroupRotation);
