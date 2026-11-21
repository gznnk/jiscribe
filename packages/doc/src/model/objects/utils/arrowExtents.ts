import {
	CIRCLE_EXTENT,
	CONCAVE_TRIANGLE_EXTENT,
	CROSS_EXTENT,
	CROW_FOOT_MANY_EXTENT,
	CROW_FOOT_ONE_EXTENT,
	CROW_FOOT_ONE_MANY_EXTENT,
	CROW_FOOT_ZERO_MANY_EXTENT,
	CROW_FOOT_ZERO_ONE_EXTENT,
	FILLED_DIAMOND_EXTENT,
	FILLED_TRIANGLE_EXTENT,
	HOLLOW_CIRCLE_EXTENT,
	HOLLOW_DIAMOND_EXTENT,
	HOLLOW_TRIANGLE_EXTENT,
	OPEN_ARROW_EXTENT,
	type ArrowExtent,
} from "./arrowHeadDimensions";
import type { ArrowType } from "../types/ArrowType";

/** Each arrow type's extent; `None` draws no head. */
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
 * How far an arrow type's head runs from its tip, in local units.
 *
 * @param type - The end's mark; undefined reads as no mark
 * @returns The extent, or null for `"None"` and undefined, which draw no head
 */
export const readArrowExtent = (
	type: ArrowType | undefined,
): ArrowExtent | null => (type === undefined ? null : ARROW_EXTENTS[type]);

/**
 * How far back along the line an arrowhead's drawing runs from its tip, in
 * world units: the extent's `length` at the size the head is drawn, its outline
 * left out.
 *
 * @param type - The end's mark; `"None"` and undefined measure 0
 * @param strokeWidth - The line's resolved stroke width (world units), which the head is drawn proportional to
 * @param arrowScale - The resolved factor on the head's size (`arrowScale`, 1 when unset)
 * @returns `length × strokeWidth × arrowScale`, or 0 where no head is drawn
 */
export const calcArrowHeadLength = (
	type: ArrowType | undefined,
	strokeWidth: number,
	arrowScale: number,
): number => {
	const extent = readArrowExtent(type);
	return extent === null ? 0 : extent.length * strokeWidth * arrowScale;
};
