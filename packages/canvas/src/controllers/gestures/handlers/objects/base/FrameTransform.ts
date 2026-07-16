import type { TransformedFrame } from "@workspace/geometry";
import {
	calcRotatedPoint,
	degreesToRadians,
	roundToDecimal,
} from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import { classifyChildRelativeRotation } from "../../../../utils/classifyChildRelativeRotation";
import { normalizeRotation } from "../../../../utils/normalizeRotation";

/**
 * Group transform handling for Frame-based shapes (Rect, Ellipse, Group, etc.).
 * Extracted from the current transformGroupChildren logic as the Frame-based path.
 */
export function transformFrameByGroup<T extends TransformedFrame>(
	frame: T,
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

	const inversedChildStartCenter = calcRotatedPoint(
		frame.cx,
		frame.cy,
		transformRootGroupStartState.cx,
		transformRootGroupStartState.cy,
		degreesToRadians(-transformRootGroupStartState.rotation),
	);

	// Compute the child's center offset in the group's internal local coordinate system (the frame with the group's rotation set to 0)
	const childOffsetXInLocalSpace =
		(inversedChildStartCenter.x - transformRootGroupStartState.cx) *
		transformRootGroupStartState.scaleX *
		transformRootGroupEndState.scaleX;
	const childOffsetYInLocalSpace =
		(inversedChildStartCenter.y - transformRootGroupStartState.cy) *
		transformRootGroupStartState.scaleY *
		transformRootGroupEndState.scaleY;

	// Compute the child's new center coordinate
	const dx = childOffsetXInLocalSpace * groupScaleX;
	const dy = childOffsetYInLocalSpace * groupScaleY;

	// Compute the child's new center coordinate in the absolute coordinate system
	const newChildCenter = calcRotatedPoint(
		transformRootGroupEndState.cx + dx,
		transformRootGroupEndState.cy + dy,
		transformRootGroupEndState.cx,
		transformRootGroupEndState.cy,
		degreesToRadians(transformRootGroupEndState.rotation),
	);

	// Optimization: for angle differences of 0, 90, 180, or 270 degrees (parallel/orthogonal), use a simple computation
	const rotationClass = classifyChildRelativeRotation(
		frame.rotation,
		transformRootGroupStartState.rotation,
	);
	let newWidth: number;
	let newHeight: number;

	if (rotationClass === "parallel") {
		// 0 or 180 degrees: parallel
		newWidth = frame.width * groupScaleX;
		newHeight = frame.height * groupScaleY;
	} else if (rotationClass === "orthogonal") {
		// 90 or 270 degrees: orthogonal
		newWidth = frame.width * groupScaleY;
		newHeight = frame.height * groupScaleX;
	} else {
		// General angle: exact computation via trigonometric functions
		const childRelativeRotation = degreesToRadians(
			frame.rotation - transformRootGroupStartState.rotation,
		);
		const cosTheta = Math.cos(childRelativeRotation);
		const sinTheta = Math.sin(childRelativeRotation);

		// Decompose the group's scaling into width/height, accounting for the child's rotation.
		// Unit vector along the child's width axis: (cos(θ), sin(θ))
		// This vector is transformed by the group's scale: (scaleX * cos(θ), scaleY * sin(θ))
		// The length of the transformed vector is the new width's scale factor
		const widthScaleX = groupScaleX * cosTheta;
		const widthScaleY = groupScaleY * sinTheta;
		const widthScale = Math.sqrt(
			widthScaleX * widthScaleX + widthScaleY * widthScaleY,
		);

		// Likewise for the height axis (rotated 90 degrees from the width axis): (-sin(θ), cos(θ))
		const heightScaleX = groupScaleX * -sinTheta;
		const heightScaleY = groupScaleY * cosTheta;
		const heightScale = Math.sqrt(
			heightScaleX * heightScaleX + heightScaleY * heightScaleY,
		);

		newWidth = frame.width * widthScale;
		newHeight = frame.height * heightScale;
	}

	// Compute the rotation angle (apply the group's rotation change to the child as well)
	const rotationDelta =
		transformRootGroupEndState.rotation - transformRootGroupStartState.rotation;
	const newRotation = normalizeRotation(frame.rotation + rotationDelta);

	// Compute scaleX/scaleY (a flip of 1 or -1)
	const newScaleX =
		frame.scaleX *
		transformRootGroupStartState.scaleX *
		transformRootGroupEndState.scaleX;
	const newScaleY =
		frame.scaleY *
		transformRootGroupStartState.scaleY *
		transformRootGroupEndState.scaleY;

	return {
		...frame,
		cx: roundToDecimal(newChildCenter.x, PRECISION.COORDINATE),
		cy: roundToDecimal(newChildCenter.y, PRECISION.COORDINATE),
		width: roundToDecimal(newWidth, PRECISION.SIZE),
		height: roundToDecimal(newHeight, PRECISION.SIZE),
		rotation: newRotation,
		scaleX: newScaleX,
		scaleY: newScaleY,
	} as T;
}

/**
 * Group rotation handling for Frame-based shapes (Rect, Ellipse, Group, etc.).
 *
 * @param frame - the Frame to rotate
 * @param rotationRootGroup - the state of the group serving as the rotation reference
 * @param endGroupRotation - the group's final rotation angle
 * @returns the rotated Frame
 */
export function rotateFrameByGroup<T extends TransformedFrame>(
	frame: T,
	rotationRootGroup: GroupState,
	endGroupRotation: number,
): T {
	const rotationDelta = endGroupRotation - rotationRootGroup.rotation;

	// Rotate the child's center coordinate about the rotation center
	const rotatedCenter = calcRotatedPoint(
		frame.cx,
		frame.cy,
		rotationRootGroup.cx,
		rotationRootGroup.cy,
		degreesToRadians(rotationDelta),
	);

	return {
		...frame,
		cx: rotatedCenter.x,
		cy: rotatedCenter.y,
		rotation: normalizeRotation(frame.rotation + rotationDelta),
	} as T;
}
