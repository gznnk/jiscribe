import {
	calcAffineTransformedPoint,
	degreesToRadians,
	type Dimensions,
	type Point,
	type Transform,
	type TransformedFrame,
} from "@workspace/geometry";

/**
 * Where a text object's box has its top-left corner drawn: the local
 * `(-width / 2, -height / 2)` corner put through the object's own rotation and
 * flips. That is where the first glyph sits, and it is the coordinate a `text`
 * doc stores as `(x, y)` (see TextDoc).
 *
 * @param frame - The box in world coordinates plus the transform applied to it; rotation is in degrees
 * @returns The corner in world coordinates, unrounded — round with `PRECISION.COORDINATE` before it reaches a doc
 */
export const calcTextDrawnTopLeft = (frame: TransformedFrame): Point =>
	calcAffineTransformedPoint(
		-frame.width / 2,
		-frame.height / 2,
		frame.scaleX,
		frame.scaleY,
		degreesToRadians(frame.rotation),
		frame.cx,
		frame.cy,
	);

/**
 * The inverse of {@link calcTextDrawnTopLeft}: the center a box of `size` needs
 * so that its own drawn top-left corner lands on `drawnTopLeft`. Re-measuring a
 * text object goes through here, which is what makes the box grow away from the
 * first glyph instead of dragging what is already typed sideways.
 *
 * @param drawnTopLeft - The corner to pin the box on, in world coordinates
 * @param size - The box's size in local pixels, before the transform
 * @param transform - Rotation (degrees) and flips of the object the box belongs to
 * @returns The center in world coordinates, i.e. `cx` / `cy` of the state
 */
export const calcTextCenterFromDrawnTopLeft = (
	drawnTopLeft: Point,
	size: Dimensions,
	transform: Transform,
): Point =>
	calcAffineTransformedPoint(
		size.width / 2,
		size.height / 2,
		transform.scaleX,
		transform.scaleY,
		degreesToRadians(transform.rotation),
		drawnTopLeft.x,
		drawnTopLeft.y,
	);
