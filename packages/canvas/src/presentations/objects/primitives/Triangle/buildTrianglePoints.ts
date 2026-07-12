/**
 * Builds the triangle point list (apex at top center, base along the bottom) for
 * a bounding box whose top-left corner is at (x, y). Shared by the object
 * renderer (centered origin) and the draw-drag preview.
 */
export const buildTrianglePoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string =>
	[
		`${x + width / 2},${y}`,
		`${x + width},${y + height}`,
		`${x},${y + height}`,
	].join(" ");
