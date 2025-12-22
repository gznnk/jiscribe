import { degreesToRadians } from "../../utils/math/common/degreesToRadians";
import { rotatePoint } from "../../utils/math/points/rotatePoint";

type TransformFrame = {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
};

/**
 * Calculates the transformed center position of an item within a group transformation.
 *
 * This function computes where an item's center should be after a group transformation,
 * taking into account:
 * - The item's initial position relative to the group
 * - The group's scale changes
 * - The group's rotation changes
 * - The group's position changes
 *
 * @param initialItemX - The x coordinate of the item before transformation
 * @param initialItemY - The y coordinate of the item before transformation
 * @param startFrame - The group's frame before transformation
 * @param endFrame - The group's frame after transformation
 * @returns The new center position {x, y} of the item after transformation
 */
export const calculateTransformedCenter = (
	initialItemX: number,
	initialItemY: number,
	startFrame: TransformFrame,
	endFrame: TransformFrame,
): { x: number; y: number } => {
	// Calculate the scale ratios between start and end frames
	const groupScaleX = endFrame.width / startFrame.width;
	const groupScaleY = endFrame.height / startFrame.height;

	// Inverse rotate the initial item center to get its position in the start frame's local space
	const inversedItemCenter = rotatePoint(
		initialItemX,
		initialItemY,
		startFrame.x,
		startFrame.y,
		degreesToRadians(-startFrame.rotation),
	);

	// Calculate the offset from the start frame center in the local space,
	// considering both the start and end frame scales
	const dx =
		(inversedItemCenter.x - startFrame.x) * startFrame.scaleX * endFrame.scaleX;
	const dy =
		(inversedItemCenter.y - startFrame.y) * startFrame.scaleY * endFrame.scaleY;

	// Apply the group's scale change to the offset
	const newDx = dx * groupScaleX;
	const newDy = dy * groupScaleY;

	// Calculate the new center position in the end frame's local space
	let newCenter = {
		x: endFrame.x + newDx,
		y: endFrame.y + newDy,
	};

	// Rotate the new center to match the end frame's rotation
	newCenter = rotatePoint(
		newCenter.x,
		newCenter.y,
		endFrame.x,
		endFrame.y,
		degreesToRadians(endFrame.rotation),
	);

	return newCenter;
};
