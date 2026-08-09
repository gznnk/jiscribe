import { roundToDecimal } from "@jiscribe/geometry";

import { PRECISION } from "../../../constants/precision";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { PolylineState } from "../../../states/objects/primitives/polyline/PolylineState";
import type {
	MoveByDeltaFunction,
	RotateByGroupFunction,
	TransformByGroupFunction,
} from "../../gestures/registry/ObjectBehaviorTypes";
import { rotatePolyByGroup, transformPolyByGroup } from "../base/PolyTransform";

/**
 * Moves a Polyline object by a delta.
 * Updates all points in the points array.
 */
export const moveByDelta: MoveByDeltaFunction<PolylineState> = (
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
 * Transforms a Polyline object when its parent group is transformed.
 */
export const transformByGroup: TransformByGroupFunction<PolylineState> = (
	state,
	groupStart,
	groupEnd,
) => {
	return transformPolyByGroup(
		state,
		groupStart as GroupState,
		groupEnd as GroupState,
	);
};

/**
 * Rotates a Polyline object when its parent group is rotated.
 */
export const rotateByGroup: RotateByGroupFunction<PolylineState> = (
	state,
	rotationRootGroup,
	endGroupRotation,
) => {
	return rotatePolyByGroup(
		state,
		rotationRootGroup as GroupState,
		endGroupRotation,
	);
};
