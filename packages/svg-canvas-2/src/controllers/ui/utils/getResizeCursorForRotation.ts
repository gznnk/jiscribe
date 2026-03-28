/**
 * Gets the appropriate resize cursor style based on rotation angle and scale.
 *
 * Maps rotation angles to directional resize cursors (n-resize, ne-resize, etc.).
 * Considers scale inversions (negative scaleX/scaleY) to provide correct cursor directions.
 *
 * @param rotation - The rotation angle in degrees
 * @param scaleX - Horizontal scaling factor (negative values indicate horizontal flip)
 * @param scaleY - Vertical scaling factor (negative values indicate vertical flip)
 * @returns The CSS cursor style name for resize operations
 *
 * @example
 * ```typescript
 * // Get cursor for top edge of a rotated rectangle
 * const cursor = getResizeCursorForRotation(45, 1, 1); // Returns "ne-resize"
 *
 * // Get cursor for horizontally flipped shape
 * const cursor = getResizeCursorForRotation(0, -1, 1); // Returns "w-resize"
 * ```
 */
export const getResizeCursorForRotation = (
	rotation: number,
	scaleX: number = 1,
	scaleY: number = 1,
): string => {
	// Adjust rotation based on scale inversions
	let adjustedRotation = rotation;

	// If scaleX is negative (horizontal flip), mirror the rotation horizontally
	if (scaleX < 0) {
		adjustedRotation = 180 - adjustedRotation;
	}

	// If scaleY is negative (vertical flip), mirror the rotation vertically
	if (scaleY < 0) {
		adjustedRotation = -adjustedRotation;
	}

	// Normalize rotation to 0-360 range
	const normalizedRotation = (adjustedRotation + 360) % 360;

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
