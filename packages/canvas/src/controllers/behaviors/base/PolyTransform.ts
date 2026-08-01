import type { Point } from "@workspace/geometry";
import {
	calcRotatedPoint,
	degreesToRadians,
	roundToDecimal,
} from "@workspace/geometry";

import { PRECISION } from "../../../constants/precision";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { PolygonState } from "../../../states/objects/primitives/polygon/PolygonState";
import type { PolylineState } from "../../../states/objects/primitives/polyline/PolylineState";

/**
 * Group transform handling for Poly-family shapes (Polygon, Polyline).
 * Transforms each vertex according to the group's transform.
 */
export function transformPolyByGroup<T extends PolygonState | PolylineState>(
	poly: T,
	transformRootGroupStartState: GroupState,
	transformRootGroupEndState: GroupState,
): T {
	const groupScaleX =
		transformRootGroupStartState.width !== 0
			? transformRootGroupEndState.width / transformRootGroupStartState.width
			: 1;
	const groupScaleY =
		transformRootGroupStartState.height !== 0
			? transformRootGroupEndState.height / transformRootGroupStartState.height
			: 1;

	// Transform each vertex
	const transformedPoints = poly.points.map((point) => {
		// 1. Undo the group's rotation (convert to the local coordinate system)
		const inversedPoint = calcRotatedPoint(
			point.x,
			point.y,
			transformRootGroupStartState.cx,
			transformRootGroupStartState.cy,
			degreesToRadians(-transformRootGroupStartState.rotation),
		);

		// 2. Compute the offset in the group's internal local coordinate system and apply scale
		const localOffsetX =
			(inversedPoint.x - transformRootGroupStartState.cx) *
			transformRootGroupStartState.scaleX *
			transformRootGroupEndState.scaleX;
		const localOffsetY =
			(inversedPoint.y - transformRootGroupStartState.cy) *
			transformRootGroupStartState.scaleY *
			transformRootGroupEndState.scaleY;

		// 3. Apply the group's scale change
		const dx = localOffsetX * groupScaleX;
		const dy = localOffsetY * groupScaleY;

		// 4. Apply the new group rotation (convert back to the absolute coordinate system)
		const newPoint = calcRotatedPoint(
			transformRootGroupEndState.cx + dx,
			transformRootGroupEndState.cy + dy,
			transformRootGroupEndState.cx,
			transformRootGroupEndState.cy,
			degreesToRadians(transformRootGroupEndState.rotation),
		);

		return {
			x: roundToDecimal(newPoint.x, PRECISION.COORDINATE),
			y: roundToDecimal(newPoint.y, PRECISION.COORDINATE),
		} as Point;
	});

	return {
		...poly,
		points: transformedPoints,
	};
}

/**
 * Group rotation handling for Poly-family shapes (Polygon, Polyline).
 * Rotates each vertex around the group's center.
 *
 * @param poly - The Poly to rotate
 * @param rotationRootGroup - State of the group that anchors the rotation
 * @param endGroupRotation - The group's final rotation angle
 * @returns The rotated Poly
 */
export function rotatePolyByGroup<T extends PolygonState | PolylineState>(
	poly: T,
	rotationRootGroup: GroupState,
	endGroupRotation: number,
): T {
	const rotationDelta = endGroupRotation - rotationRootGroup.rotation;

	// Rotate each vertex around the rotation center
	const rotatedPoints = poly.points.map((point) => {
		const rotatedPoint = calcRotatedPoint(
			point.x,
			point.y,
			rotationRootGroup.cx,
			rotationRootGroup.cy,
			degreesToRadians(rotationDelta),
		);

		return {
			x: roundToDecimal(rotatedPoint.x, PRECISION.COORDINATE),
			y: roundToDecimal(rotatedPoint.y, PRECISION.COORDINATE),
		} as Point;
	});

	return {
		...poly,
		points: rotatedPoints,
	};
}
