/** Edge length below which a drag is treated as a misdrag rather than a draw. */
export const DEFAULT_MIN_DRAW_SIZE = 5;

/** Normalized bounds of a two-point drag, in the same coordinate space as the input points. */
export type DrawBounds = {
	/** Smaller of the two x coordinates. */
	left: number;
	/** Smaller of the two y coordinates. */
	top: number;
	/** Non-negative horizontal extent. */
	width: number;
	/** Non-negative vertical extent. */
	height: number;
};

/**
 * Normalizes a two-point drag into top-left bounds, rejecting misdrags.
 *
 * Shared by every `createDocFromBounds` that draws inside an axis-aligned box,
 * whether the doc stores a top-left origin (x/y/width/height) or a center one
 * (cx/cy/rx/ry) — a center origin is `left + width / 2`, `top + height / 2`.
 *
 * @param x1 x of the drag start point; may be greater than x2 (drawn rightward or leftward).
 * @param y1 y of the drag start point; may be greater than y2.
 * @param x2 x of the drag end point.
 * @param y2 y of the drag end point.
 * @param minSize Lower bound applied to both width and height, defaulting to
 *   {@link DEFAULT_MIN_DRAW_SIZE}. Exactly minSize passes (the check is strict `<`);
 *   pass 0 to accept any drag, as programmatic creation does.
 * @returns The normalized bounds, or null if either edge is shorter than minSize.
 */
export const calcDrawBounds = (
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	minSize: number = DEFAULT_MIN_DRAW_SIZE,
): DrawBounds | null => {
	const width = Math.abs(x2 - x1);
	const height = Math.abs(y2 - y1);
	if (width < minSize || height < minSize) {
		return null;
	}
	return { left: Math.min(x1, x2), top: Math.min(y1, y2), width, height };
};
