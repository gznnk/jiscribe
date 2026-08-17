import {
	calcAffineTransformedPoint,
	degreesToRadians,
	type BoundingBox,
	type Rect,
	type TransformedFrame,
} from "@jiscribe/geometry";

/**
 * World-space bounds of a rect given in a shape's own local space (origin at the
 * shape center, before transform) — a text region or a visual-extent rect mapped
 * to where it is actually drawn.
 *
 * The four corners are mapped individually and the result is the upright box
 * around them, so a rotated shape yields a box wider than the rect itself rather
 * than a rotated one.
 *
 * @param rect - The local-space rect; a negative width/height (flipped shape) is
 *   handled by the corner mapping and needs no normalization
 * @param frame - The shape the rect belongs to, supplying the transform (center,
 *   rotation in degrees, flips)
 * @returns The axis-aligned bounds in world coordinates
 */
export const calcTransformedRectBounds = (
	rect: Rect,
	frame: TransformedFrame,
): BoundingBox => {
	const radians = degreesToRadians(frame.rotation ?? 0);
	const corners = [
		[rect.x, rect.y],
		[rect.x + rect.width, rect.y],
		[rect.x + rect.width, rect.y + rect.height],
		[rect.x, rect.y + rect.height],
	].map(([localX, localY]) =>
		calcAffineTransformedPoint(
			localX,
			localY,
			frame.scaleX ?? 1,
			frame.scaleY ?? 1,
			radians,
			frame.cx,
			frame.cy,
		),
	);

	const xs = corners.map((corner) => corner.x);
	const ys = corners.map((corner) => corner.y);
	return {
		left: Math.min(...xs),
		top: Math.min(...ys),
		right: Math.max(...xs),
		bottom: Math.max(...ys),
	};
};
