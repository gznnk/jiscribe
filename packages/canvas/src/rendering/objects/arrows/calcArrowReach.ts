import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";
import { readArrowExtent } from "@jiscribe/doc/model/objects/utils/arrowExtents";

/**
 * How far (world units) an arrowhead's drawing reaches from its tip in any
 * direction, its outline included: a square of this half side centered on the
 * tip contains the head whichever way it points.
 *
 * @param type - The end's mark; "None" and undefined reach 0, adding nothing
 * @param strokeWidth - The line's resolved stroke width (world units), which the head is drawn proportional to and outlined at most as wide as
 * @param arrowScale - The resolved factor on the head's size (`arrowScale`, 1 when unset)
 * @returns `hypot(length, halfWidth) × strokeWidth × arrowScale + strokeWidth`. The
 *   trailing `strokeWidth` is the outline's room: a line-drawn head is outlined at
 *   most at the stroke width (calcArrowOutlineWidth), and its sharpest miter (1.12 ×
 *   the outline) still falls inside once the hypotenuse's own slack over `length`
 *   is counted
 */
export const calcArrowReach = (
	type: ArrowType | undefined,
	strokeWidth: number,
	arrowScale: number,
): number => {
	const extent = readArrowExtent(type);
	if (!extent) {
		return 0;
	}
	return (
		Math.hypot(extent.length, extent.halfWidth) * strokeWidth * arrowScale +
		strokeWidth
	);
};
