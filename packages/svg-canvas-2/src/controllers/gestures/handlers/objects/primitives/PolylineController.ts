import { roundToDecimal } from "@workspace/geometry";
import type { Point } from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type {
	MoveByDeltaFunction,
	RotateByGroupFunction,
	TransformByGroupFunction,
} from "../../../../../registry/ObjectRegistryTypes";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import type { PolylineState } from "../../../../../states/objects/primitives/polyline/PolylineState";
import { transformPolyByGroup, rotatePolyByGroup } from "../base/PolyTransform";

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

/**
 * Updates a specific vertex position in the Polyline.
 * @param state - Current Polyline state
 * @param vertexIndex - Index of the vertex to update
 * @param newPosition - New position for the vertex
 * @returns Updated Polyline state
 */
export function updateVertexPosition(
	state: PolylineState,
	vertexIndex: number,
	newPosition: Point,
): PolylineState {
	if (vertexIndex < 0 || vertexIndex >= state.points.length) {
		return state;
	}

	const newPoints = [...state.points];
	newPoints[vertexIndex] = {
		x: roundToDecimal(newPosition.x, PRECISION.COORDINATE),
		y: roundToDecimal(newPosition.y, PRECISION.COORDINATE),
	};

	return {
		...state,
		points: newPoints,
	};
}
