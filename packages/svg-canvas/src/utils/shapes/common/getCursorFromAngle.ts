/**
 * Gets the appropriate cursor style based on an angle.
 * Maps angles to directional resize cursors (n-resize, ne-resize, etc.).
 * Considers scale inversions to provide correct cursor directions.
 *
 * @param angle - The angle in degrees
 * @param scaleX - Horizontal scaling factor (negative values indicate horizontal flip)
 * @param scaleY - Vertical scaling factor (negative values indicate vertical flip)
 * @returns The CSS cursor style name
 */
export const getCursorFromAngle = (
	angle: number,
	scaleX: number = 1,
	scaleY: number = 1,
): string => {
	// Adjust angle based on scale inversions
	let adjustedAngle = angle;

	// If scaleX is negative (horizontal flip), mirror the angle horizontally
	if (scaleX < 0) {
		adjustedAngle = 180 - adjustedAngle;
	}

	// If scaleY is negative (vertical flip), mirror the angle vertically
	if (scaleY < 0) {
		adjustedAngle = -adjustedAngle;
	}

	// Add 360 degrees to angle to make it 0 degrees or more
	const _angle = (adjustedAngle + 360) % 360;

	if (-22.5 <= _angle && _angle < 22.5) {
		return "n-resize";
	}
	if (22.5 <= _angle && _angle < 67.5) {
		return "ne-resize";
	}
	if (67.5 <= _angle && _angle < 112.5) {
		return "e-resize";
	}
	if (112.5 <= _angle && _angle < 157.5) {
		return "se-resize";
	}
	if (157.5 <= _angle && _angle < 202.5) {
		return "s-resize";
	}
	if (202.5 <= _angle && _angle < 247.5) {
		return "sw-resize";
	}
	if (247.5 <= _angle && _angle < 292.5) {
		return "w-resize";
	}
	if (292.5 <= _angle && _angle < 337.5) {
		return "nw-resize";
	}
	return "n-resize";
};
