import {
	calcEuclideanDistance,
	calcVectorAngleRad,
	radiansToDegrees,
} from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";

/** Where a segment lies and how long it is, as an SVG group placed along it needs it. */
export type SegmentPlacement = {
	/** SVG transform putting the group's origin at the segment's midpoint, its x axis pointing from the first endpoint to the second. */
	transform: string;
	/** Distance between the two endpoints, which is the segment's extent along that x axis. */
	length: number;
};

/**
 * Places an SVG group along a segment: its origin at the midpoint, its x axis
 * turned to run from the first endpoint to the second. Whatever the caller draws
 * centred on the origin, `length` wide, then lies on the segment; the group
 * carries no scale, so a size divided by the zoom stays the same on screen.
 *
 * @param from - One endpoint, in the coordinate space the group is drawn in
 * @param to - The other endpoint, in the same space; swapping the two turns the group end for end and changes nothing else
 * @returns The transform and the length; a zero-length segment comes back with an angle of 0 rather than NaN
 */
export const calcSegmentPlacement = (
	from: Point,
	to: Point,
): SegmentPlacement => {
	const length = calcEuclideanDistance(from.x, from.y, to.x, to.y);
	const angle = radiansToDegrees(
		calcVectorAngleRad(to.x, to.y, from.x, from.y),
	);
	return {
		transform: `translate(${(from.x + to.x) / 2} ${(from.y + to.y) / 2}) rotate(${angle})`,
		length,
	};
};
