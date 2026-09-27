import {
	calcFrameCenterFromTopLeft,
	calcFrameTopLeft,
	type Dimensions,
	type Point,
	type Transform,
} from "@jiscribe/geometry";

/**
 * The transform a doc applies to its own box, in the form the geometry helpers take.
 * Read off a plain record so a factory merging defaults and an op building a doc can
 * both hand over what they hold; a field that is absent or not of its declared type
 * is the identity (see TransformDoc).
 */
const readDocTransform = (
	doc: Readonly<Record<string, unknown>>,
): Transform => ({
	rotation: typeof doc.rotation === "number" ? doc.rotation : 0,
	scaleX: doc.flipX === true ? -1 : 1,
	scaleY: doc.flipY === true ? -1 : 1,
});

/**
 * Where a box of `size` centered on `center` has its top-left corner drawn. That
 * corner is what a `geometry: "point"` doc stores as `(x, y)` (see GeometryType), so
 * every path writing such a doc from a center goes through here — the doc's own
 * transform fields being what this adds to {@link calcFrameTopLeft}.
 *
 * @param center - The box's center in world coordinates
 * @param size - The box's size in local px, before the transform; a zero size answers `center` itself
 * @param doc - The doc the box belongs to; only `rotation` (degrees), `flipX` and `flipY` are read
 * @returns The corner in world coordinates, unrounded — round with `roundDocCoordinate` before it reaches a doc
 */
export const calcPointDocDrawnTopLeft = (
	center: Point,
	size: Dimensions,
	doc: Readonly<Record<string, unknown>>,
): Point =>
	calcFrameTopLeft({
		cx: center.x,
		cy: center.y,
		width: size.width,
		height: size.height,
		...readDocTransform(doc),
	});

/**
 * The inverse of {@link calcPointDocDrawnTopLeft}: the center a box of `size` needs for
 * its own drawn top-left corner to land on `drawnTopLeft`. What turns the top-left an
 * op is given (`addObject`) into the center a factory places by.
 *
 * @param drawnTopLeft - The corner to pin the box on, in world coordinates
 * @param size - The box's size in local px, before the transform; a zero size answers `drawnTopLeft` itself
 * @param doc - The doc the box belongs to; only `rotation` (degrees), `flipX` and `flipY` are read
 * @returns The center in world coordinates, unrounded
 */
export const calcPointDocCenter = (
	drawnTopLeft: Point,
	size: Dimensions,
	doc: Readonly<Record<string, unknown>>,
): Point =>
	calcFrameCenterFromTopLeft(drawnTopLeft, size, readDocTransform(doc));
