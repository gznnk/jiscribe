import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";
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
} from "@jiscribe/doc/model/objects/utils/arrowHeadDimensions";

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
 * head's constant in `@jiscribe/doc` (arrowHeadDimensions), next to the dimensions the head
 * is drawn from, so the inset follows when the head changes.
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
