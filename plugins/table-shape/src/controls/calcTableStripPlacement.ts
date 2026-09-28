import {
	calcEuclideanDistance,
	calcVectorAngleRad,
	radiansToDegrees,
} from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";

/** Where a strip is drawn and how long it is, as an SVG group needs it. */
export type TableStripPlacement = {
	/** SVG transform putting the group's origin at the strip's midpoint, its x axis along the strip. */
	transform: string;
	/** Distance between the two endpoints, which is the strip's length along that x axis. */
	length: number;
};

/**
 * Places a strip spanning two world points: a group at their midpoint, turned to
 * face from the first to the second. Drawing from the endpoints rather than from
 * the table's box is what lets a strip follow whatever the transform did to the
 * edge it runs along — a rotated table's strips lie on its edges, and a flipped
 * one's are turned end for end.
 *
 * The caller then draws its rect centred on the origin, `length` wide and as
 * thick as it wants; a thickness divided by the zoom stays the same size on
 * screen, the group carrying no scale of its own.
 *
 * @param from - One endpoint in world coordinates
 * @param to - The other; swapping the two turns the strip end for end and changes nothing else
 * @returns The transform and the length; a zero-length strip comes back with an angle of 0 rather than NaN
 */
export const calcTableStripPlacement = (
	from: Point,
	to: Point,
): TableStripPlacement => {
	const length = calcEuclideanDistance(from.x, from.y, to.x, to.y);
	const angle = radiansToDegrees(
		calcVectorAngleRad(to.x, to.y, from.x, from.y),
	);
	return {
		transform: `translate(${(from.x + to.x) / 2} ${(from.y + to.y) / 2}) rotate(${angle})`,
		length,
	};
};
