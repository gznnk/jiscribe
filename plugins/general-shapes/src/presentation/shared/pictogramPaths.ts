import type { Point } from "@jiscribe/geometry";

/**
 * SVG path fragments the pictogram builders share. Every helper takes plain
 * numbers in the shape's local coordinates and returns one subpath, so a builder
 * composes a figure by listing them.
 */

/**
 * Closed polygon through the given corners. Pairs with the outline calculators,
 * which hand the very same corner list to the connector router — a shape whose
 * silhouette is a polygon therefore has one source of truth for it.
 *
 * @param points Corners in order; a single point or an empty list yields an empty path.
 * @returns A closed subpath, or `""` when there is nothing to close.
 */
export const buildPolygonPath = (points: Point[]): string => {
	if (points.length < 2) {
		return "";
	}
	const [start, ...rest] = points;
	const edges = rest.map((point) => `L ${point.x} ${point.y}`).join(" ");
	return `M ${start.x} ${start.y} ${edges} Z`;
};

/**
 * Rectangle with equal corner radii.
 *
 * @param x Left edge in local coordinates.
 * @param y Top edge in local coordinates.
 * @param width Box width; not clamped, so a caller passing 0 gets a degenerate path.
 * @param height Box height.
 * @param radius Corner radius, clamped to half the shorter side so it cannot invert the corners.
 * @returns A closed subpath starting at the top-left corner arc.
 */
export const buildRoundedRectPath = (
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
): string => {
	const r = Math.min(radius, width / 2, height / 2);
	return (
		`M ${x + r} ${y} H ${x + width - r} A ${r} ${r} 0 0 1 ${x + width} ${y + r} ` +
		`V ${y + height - r} A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} ` +
		`H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + height - r} ` +
		`V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`
	);
};

/**
 * Ellipse as two half arcs, so it can be used as a subpath of a larger path
 * (a `<circle>` element cannot).
 *
 * @param cx Center x in local coordinates.
 * @param cy Center y in local coordinates.
 * @param radiusX Horizontal radius.
 * @param radiusY Vertical radius; pass the same value as radiusX for a circle.
 * @returns A closed subpath, wound clockwise.
 */
export const buildEllipsePath = (
	cx: number,
	cy: number,
	radiusX: number,
	radiusY: number,
): string =>
	`M ${cx - radiusX} ${cy} ` +
	`A ${radiusX} ${radiusY} 0 1 0 ${cx + radiusX} ${cy} ` +
	`A ${radiusX} ${radiusY} 0 1 0 ${cx - radiusX} ${cy} Z`;

/**
 * Horizontal open subpath.
 *
 * @param y The line's y in local coordinates.
 * @param fromX Start x.
 * @param toX End x; may be less than fromX (direction only affects dash phase).
 */
export const buildHorizontalLinePath = (
	y: number,
	fromX: number,
	toX: number,
): string => `M ${fromX} ${y} H ${toX}`;

/**
 * Vertical open subpath.
 *
 * @param x The line's x in local coordinates.
 * @param fromY Start y.
 * @param toY End y; may be less than fromY.
 */
export const buildVerticalLinePath = (
	x: number,
	fromY: number,
	toY: number,
): string => `M ${x} ${fromY} V ${toY}`;

/**
 * Right-pointing chevron (the `>` of a shell prompt, a queue's direction mark).
 *
 * @param x The tip's x in local coordinates.
 * @param y The tip's y in local coordinates.
 * @param width Horizontal run from the arms to the tip.
 * @param height Vertical span from the upper arm to the lower one, centered on y.
 * @returns An open subpath; stroke it with a round join.
 */
export const buildChevronPath = (
	x: number,
	y: number,
	width: number,
	height: number,
): string =>
	`M ${x - width} ${y - height / 2} L ${x} ${y} L ${x - width} ${y + height / 2}`;
