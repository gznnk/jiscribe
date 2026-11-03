import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";

import type { ArrowExtent } from "./ArrowTypes";
import { CIRCLE_EXTENT } from "./shapes/Circle";
import { CONCAVE_TRIANGLE_EXTENT } from "./shapes/ConcaveTriangle";
import { CROSS_EXTENT } from "./shapes/Cross";
import { CROW_FOOT_MANY_EXTENT } from "./shapes/CrowFootMany";
import { CROW_FOOT_ONE_EXTENT } from "./shapes/CrowFootOne";
import { CROW_FOOT_ONE_MANY_EXTENT } from "./shapes/CrowFootOneMany";
import { CROW_FOOT_ZERO_MANY_EXTENT } from "./shapes/CrowFootZeroMany";
import { CROW_FOOT_ZERO_ONE_EXTENT } from "./shapes/CrowFootZeroOne";
import { FILLED_DIAMOND_EXTENT } from "./shapes/FilledDiamond";
import { FILLED_TRIANGLE_EXTENT } from "./shapes/FilledTriangle";
import { HOLLOW_CIRCLE_EXTENT } from "./shapes/HollowCircle";
import { HOLLOW_DIAMOND_EXTENT } from "./shapes/HollowDiamond";
import { HOLLOW_TRIANGLE_EXTENT } from "./shapes/HollowTriangle";
import { OPEN_ARROW_EXTENT } from "./shapes/OpenArrow";

/**
 * Each arrow type's extent. Unlike the line inset (getArrowLineInset), which is
 * where the line stops, this is the rear of the drawing: a circle or a crow's
 * foot runs on past its inset.
 */
const ARROW_EXTENTS: Record<ArrowType, ArrowExtent | null> = {
	FilledTriangle: FILLED_TRIANGLE_EXTENT,
	ConcaveTriangle: CONCAVE_TRIANGLE_EXTENT,
	OpenArrow: OPEN_ARROW_EXTENT,
	HollowTriangle: HOLLOW_TRIANGLE_EXTENT,
	FilledDiamond: FILLED_DIAMOND_EXTENT,
	HollowDiamond: HOLLOW_DIAMOND_EXTENT,
	Circle: CIRCLE_EXTENT,
	HollowCircle: HOLLOW_CIRCLE_EXTENT,
	Cross: CROSS_EXTENT,
	CrowFootMany: CROW_FOOT_MANY_EXTENT,
	CrowFootOneMany: CROW_FOOT_ONE_MANY_EXTENT,
	CrowFootZeroMany: CROW_FOOT_ZERO_MANY_EXTENT,
	CrowFootOne: CROW_FOOT_ONE_EXTENT,
	CrowFootZeroOne: CROW_FOOT_ZERO_ONE_EXTENT,
	None: null,
};

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
	const extent = type === undefined ? null : ARROW_EXTENTS[type];
	if (!extent) {
		return 0;
	}
	return (
		Math.hypot(extent.length, extent.halfWidth) * strokeWidth * arrowScale +
		strokeWidth
	);
};
