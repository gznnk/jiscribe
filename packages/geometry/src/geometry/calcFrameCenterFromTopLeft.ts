import { degreesToRadians } from "../common/degreesToRadians";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
import type { Dimensions } from "../types/Dimensions";
import type { Point } from "../types/Point";
import type { Transform } from "../types/Transform";

/**
 * The inverse of {@link calcFrameTopLeft}: the center a box of `size` needs for its
 * own transformed top-left corner to land on `topLeft`. Pinning that corner while the
 * size changes is what makes a box grow away from it instead of dragging its content
 * sideways, and it is how a `geometry: "point"` document's stored corner is read back
 * as the center a frame is built from.
 *
 * @param topLeft - The corner to pin the box on, in world coordinates
 * @param size - The box's size in local px, before the transform; a zero size answers `topLeft` itself
 * @param transform - Rotation (degrees) and flips of the box; a TransformedFrame satisfies it as it stands
 * @returns The center in world coordinates, unrounded
 */
export const calcFrameCenterFromTopLeft = (
	topLeft: Point,
	size: Dimensions,
	transform: Transform,
): Point =>
	calcAffineTransformedPoint(
		size.width / 2,
		size.height / 2,
		transform.scaleX,
		transform.scaleY,
		degreesToRadians(transform.rotation),
		topLeft.x,
		topLeft.y,
	);
