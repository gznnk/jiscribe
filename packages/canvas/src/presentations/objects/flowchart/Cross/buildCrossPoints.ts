/**
 * Builds the cross (plus) point list, with arms one third of the width/height,
 * for a bounding box whose top-left corner is at (x, y). Shared by the object
 * renderer (centered origin) and the draw-drag preview.
 */
export const buildCrossPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => {
	const w3 = width / 3;
	const h3 = height / 3;
	return [
		`${x + w3},${y}`,
		`${x + 2 * w3},${y}`,
		`${x + 2 * w3},${y + h3}`,
		`${x + width},${y + h3}`,
		`${x + width},${y + 2 * h3}`,
		`${x + 2 * w3},${y + 2 * h3}`,
		`${x + 2 * w3},${y + height}`,
		`${x + w3},${y + height}`,
		`${x + w3},${y + 2 * h3}`,
		`${x},${y + 2 * h3}`,
		`${x},${y + h3}`,
		`${x + w3},${y + h3}`,
	].join(" ");
};
