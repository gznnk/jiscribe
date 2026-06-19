/**
 * Gets the appropriate resize cursor style based on rotation angle and scale.
 *
 * Maps rotation angles to directional resize cursors (n-resize, ne-resize, etc.).
 * Considers scale inversions (negative scaleX/scaleY) to provide correct cursor directions.
 *
 * @param offset - The handle's direction offset in the shape's local oriented frame (degrees)
 * @param rotation - The shape's rotation angle in degrees
 * @param scaleX - Horizontal scaling factor (negative values indicate horizontal flip)
 * @param scaleY - Vertical scaling factor (negative values indicate vertical flip)
 * @returns The CSS cursor style name for resize operations
 *
 * @example
 * ```typescript
 * // Get cursor for right-center handle of a 45° rotated rectangle
 * const cursor = getResizeCursorForRotation(0, 45, 1, 1); // Returns "se-resize"
 *
 * // Get cursor for right-center handle of a horizontally flipped shape
 * const cursor = getResizeCursorForRotation(0, 0, -1, 1); // Returns "w-resize"
 * ```
 */
export const getResizeCursorForRotation = (
	offset: number,
	rotation: number,
	scaleX: number = 1,
	scaleY: number = 1,
): string => {
	// Apply scale inversions to the local offset angle only,
	// then add back the shape rotation to get the final screen-space angle.
	// Applying to the combined angle (rotation + offset) would give wrong results
	// when rotation ≠ 0.
	let localAngle = offset;

	// If scaleX is negative (horizontal flip), mirror the local angle horizontally
	if (scaleX < 0) {
		localAngle = 180 - localAngle;
	}

	// If scaleY is negative (vertical flip), mirror the local angle vertically
	if (scaleY < 0) {
		localAngle = -localAngle;
	}

	// Normalize rotation to 0-360 range
	const normalizedRotation = (((rotation + localAngle) % 360) + 360) % 360;

	// Map rotation to cursor (45-degree increments)
	if (normalizedRotation >= 337.5 || normalizedRotation < 22.5) {
		return "e-resize";
	}
	if (normalizedRotation >= 22.5 && normalizedRotation < 67.5) {
		return "se-resize";
	}
	if (normalizedRotation >= 67.5 && normalizedRotation < 112.5) {
		return "s-resize";
	}
	if (normalizedRotation >= 112.5 && normalizedRotation < 157.5) {
		return "sw-resize";
	}
	if (normalizedRotation >= 157.5 && normalizedRotation < 202.5) {
		return "w-resize";
	}
	if (normalizedRotation >= 202.5 && normalizedRotation < 247.5) {
		return "nw-resize";
	}
	if (normalizedRotation >= 247.5 && normalizedRotation < 292.5) {
		return "n-resize";
	}
	if (normalizedRotation >= 292.5 && normalizedRotation < 337.5) {
		return "ne-resize";
	}

	return "e-resize";
};
