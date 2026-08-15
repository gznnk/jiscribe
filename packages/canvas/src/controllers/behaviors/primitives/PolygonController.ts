import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { PolygonState } from "../../../states/objects/primitives/polygon/PolygonState";
import type {
	MoveByDeltaFunction,
	RotateByGroupFunction,
	TransformByGroupFunction,
} from "../../gestures/registry/ObjectBehaviorTypes";
import { rotatePolyByGroup, transformPolyByGroup } from "../base/PolyTransform";

/**
 * Moves a Polygon object by a delta.
 * Updates all points in the points array.
 */
export const moveByDelta: MoveByDeltaFunction<PolygonState> = (
	state,
	delta,
) => {
	return {
		...state,
		points: state.points.map((p) => ({
			x: p.x + delta.x,
			y: p.y + delta.y,
		})),
	};
};

/**
 * Transforms a Polygon object when its parent group is transformed.
 */
export const transformByGroup: TransformByGroupFunction<PolygonState> = (
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
 * Rotates a Polygon object when its parent group is rotated.
 */
export const rotateByGroup: RotateByGroupFunction<PolygonState> = (
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
