import { CIRCLE_INSET } from "./shapes/Circle";
import { CONCAVE_TRIANGLE_INSET } from "./shapes/ConcaveTriangle";
import { FILLED_DIAMOND_INSET } from "./shapes/FilledDiamond";
import { FILLED_TRIANGLE_INSET } from "./shapes/FilledTriangle";
import { HOLLOW_DIAMOND_INSET } from "./shapes/HollowDiamond";
import { HOLLOW_TRIANGLE_INSET } from "./shapes/HollowTriangle";
import type { ArrowType } from "../../../schemas/objects/types/ArrowType";

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
 * shape's constant (keeping the shape and its inset in the same file so the inset follows
 * when the shape changes).
 *
 * Types that are not shortened:
 *   - None: no arrow
 *   - OpenArrow: has no body and connects to the line at the tip (endpoint), so shortening would leave a gap
 */
const ARROW_LINE_INSETS: Record<ArrowType, number> = {
	FilledTriangle: FILLED_TRIANGLE_INSET,
	ConcaveTriangle: CONCAVE_TRIANGLE_INSET,
	OpenArrow: 0,
	HollowTriangle: HOLLOW_TRIANGLE_INSET,
	FilledDiamond: FILLED_DIAMOND_INSET,
	HollowDiamond: HOLLOW_DIAMOND_INSET,
	Circle: CIRCLE_INSET,
	None: 0,
};

/**
 * Returns the line inset (in local units) for the given arrow type. The caller
 * multiplies by the arrow scale (= strokeWidth) for the actual distance.
 * `undefined` and types that need no shortening return 0.
 */
export const getArrowLineInset = (type: ArrowType | undefined): number =>
	type === undefined ? 0 : ARROW_LINE_INSETS[type];
