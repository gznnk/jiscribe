import {
	CIRCLE_INSET,
	CONCAVE_TRIANGLE_INSET,
	CROSS_INSET,
	CROW_FOOT_MANY_INSET,
	CROW_FOOT_ONE_INSET,
	CROW_FOOT_ONE_MANY_INSET,
	CROW_FOOT_ZERO_MANY_INSET,
	CROW_FOOT_ZERO_ONE_INSET,
	FILLED_DIAMOND_INSET,
	FILLED_TRIANGLE_INSET,
	HOLLOW_CIRCLE_INSET,
	HOLLOW_DIAMOND_INSET,
	HOLLOW_TRIANGLE_INSET,
} from "./arrowHeadDimensions";
import { calcArrowLineEndWedge } from "./arrowOutlineThinning";
import type { ArrowType } from "../types/ArrowType";

/**
 * The distance (in local units) up to the "root where the line should terminate" for each arrow type.
 *
 * A connector/polyline line is drawn all the way to the endpoint (the arrow tip), so left as-is:
 *   1. With hollow arrows, the line appears to pass through the hollow interior.
 *   2. With a thick line, it spills over by the line width from the narrow tip.
 * Terminating the line this distance short resolves both, independent of background color.
 *
 * `Record<ArrowType, number>` covers every type, so a missing inset definition when an
 * arrow type is added is caught as a compile error. Each value references the corresponding
 * head's constant in arrowHeadDimensions, next to the dimensions the head is drawn from,
 * so the inset follows when the head changes.
 *
 * Types that are not shortened:
 *   - None: no arrow
 *   - OpenArrow: has no body and connects to the line at the tip (endpoint), so shortening would leave a gap
 *     (a head thinned below the line's width is stopped short by calcArrowLineInset instead)
 *   - Cross: sits on the line by definition (UML non-navigable end)
 */
const ARROW_LINE_INSETS: Record<ArrowType, number> = {
	FilledTriangle: FILLED_TRIANGLE_INSET,
	ConcaveTriangle: CONCAVE_TRIANGLE_INSET,
	OpenArrow: 0,
	HollowTriangle: HOLLOW_TRIANGLE_INSET,
	FilledDiamond: FILLED_DIAMOND_INSET,
	HollowDiamond: HOLLOW_DIAMOND_INSET,
	Circle: CIRCLE_INSET,
	HollowCircle: HOLLOW_CIRCLE_INSET,
	Cross: CROSS_INSET,
	CrowFootMany: CROW_FOOT_MANY_INSET,
	CrowFootOneMany: CROW_FOOT_ONE_MANY_INSET,
	CrowFootZeroMany: CROW_FOOT_ZERO_MANY_INSET,
	CrowFootOne: CROW_FOOT_ONE_INSET,
	CrowFootZeroOne: CROW_FOOT_ZERO_ONE_INSET,
	None: 0,
};

/**
 * Returns the line inset (in local units) for the given arrow type, the part
 * that scales with the head; calcArrowLineInset turns it into the distance a line
 * actually stops short.
 * `undefined` and types that need no shortening return 0.
 */
export const getArrowLineInset = (type: ArrowType | undefined): number =>
	type === undefined ? 0 : ARROW_LINE_INSETS[type];

/**
 * How far short of the tip (world units) a line stops under the head at that
 * end: the type's own inset (getArrowLineInset) plus the inset of the wedge the
 * head fills past the line's end (calcArrowLineEndWedge), both at the head's
 * scale.
 *
 * @param type - The end's mark; undefined and "None" stop nothing short
 * @param strokeWidth - The line's resolved stroke width (world units)
 * @param arrowScale - The resolved factor on the head's size (`arrowScale`, 1 when unset)
 * @returns The distance to pull the line's end back along its last segment
 */
export const calcArrowLineInset = (
	type: ArrowType | undefined,
	strokeWidth: number,
	arrowScale: number,
): number => {
	// The wedge a head fills past the line's end is what decides how far short
	// the line stops, so the two cannot disagree.
	const wedgeInset = calcArrowLineEndWedge(type, arrowScale)?.inset ?? 0;
	return (getArrowLineInset(type) + wedgeInset) * strokeWidth * arrowScale;
};
