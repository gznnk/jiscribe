import { castRayOnPolygon } from "./castRayOnPolygon";
import { degreesToRadians } from "../common/degreesToRadians";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
import type { Point } from "../types/Point";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Return the intersection point on a polygon outline along the ray from the
 * shape center toward `toward` (world coord). The polygon is given in local,
 * centered coordinates (width/height units, pre-transform) and transformed to
 * world space with the same affine as the renderer / calcFrameKeyPoint, so the
 * result follows the shape's rotation and flip.
 *
 * Returns null if the ray hits no edge (degenerate polygon, toward == center).
 */
export function calcOutlinePointTowardForPolygon(
	localPolygon: readonly Point[],
	frame: TransformedFrame,
	toward: Point,
): Point | null {
	if (localPolygon.length < 2) {
		return null;
	}
	const { cx, cy, rotation, scaleX, scaleY } = frame;
	const angleRad = degreesToRadians(rotation);

	const worldPolygon: Point[] = new Array(localPolygon.length);
	for (let i = 0; i < localPolygon.length; i++) {
		const p = localPolygon[i];
		worldPolygon[i] = calcAffineTransformedPoint(
			p.x,
			p.y,
			scaleX,
			scaleY,
			angleRad,
			cx,
			cy,
		);
	}

	return castRayOnPolygon(worldPolygon, cx, cy, toward.x - cx, toward.y - cy);
}
