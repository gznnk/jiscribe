/**
 * Builds the delay path (a rectangle whose right edge is a semicircular bulge)
 * for a bounding box whose top-left corner is at (x, y). The cap radius is half
 * the height, so the bulge stays inside the bounding box. Shared by the object
 * renderer (centered origin) and the draw-drag preview.
 */
export const buildDelayPath = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => {
	const r = height / 2;
	return (
		`M ${x} ${y} H ${x + width - r} ` +
		`A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} ` +
		`H ${x} Z`
	);
};
