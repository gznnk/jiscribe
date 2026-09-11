/**
 * Builds the delay path (a rectangle whose right edge bulges out) for a bounding
 * box whose top-left corner is at (x, y). The bulge spans the full height, so
 * its vertical radius is half of that; its horizontal one stops at the width,
 * which is what keeps a box more than twice as tall as it is wide from running
 * the straight edges out through the left side. The two are equal — a true
 * semicircle — at every box that is not that tall. Shared by the object renderer
 * (centered origin) and the draw-drag preview.
 */
export const buildDelayPath = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => {
	const ry = height / 2;
	const rx = Math.min(width, ry);
	return (
		`M ${x} ${y} H ${x + width - rx} ` +
		`A ${rx} ${ry} 0 0 1 ${x + width - rx} ${y + height} ` +
		`H ${x} Z`
	);
};
