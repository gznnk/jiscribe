import type { BoundingBox } from "@jiscribe/geometry";

import { calcEndGaps } from "./routeEnds";
import type { NudgeContext, RouteToNudge } from "./routeSegments";
import { nudgeAlong } from "./spreadSegments";
import { straightenJogs } from "./straightenJogs";

/**
 * Spread apart routes that run on top of one another or close alongside ("nudging",
 * as in Wybrow, Marriott & Stuckey 2009): every segment moves sideways, its two
 * neighbours stretching or shrinking to keep the route right-angled, so parallel
 * segments sharing a stretch stand GAP_LANE_SPACING apart, ordered so routes
 * running together do not cross needlessly. A route's first and last segments (its
 * stubs) move too, each end point sliding along its box side within the end's slide,
 * so the ends sharing a side stand up to EDGE_END_SPACING apart, as far as
 * their slides leave room for. A group of segments with too little room is spread as
 * far as whole px down to LEAST_LANE_SPACING allow, its ends squeezing before its
 * lanes do; a conflicting pair with no room to part at all is kept as it stands,
 * holding back none of the others. The vertical segments move first, then the
 * horizontal ones on the routes as that left them.
 *
 * Last, a jog (a segment between two parallel ones running the same way), of any
 * length, is taken out where one of the two can move onto the other's line without
 * coming nearer than GAP_LANE_SPACING to a box, a border's side or another
 * segment alongside (than their end gap, for two ends of one side), unless it
 * already ran nearer, and without crossing more segments; its points go, and the two
 * segments merge. An end point moved for it stays on its box side, within its slide.
 *
 * Routes sharing a bundle key (see RouteToNudge.bundleKeys) keep their trunk: their
 * segments lying on one line and sharing or touching a stretch are spread as one
 * segment (see mergeBundledSegments), and no jog is taken out by moving one of them
 * off that line. A pinned end (see RouteEnd.isPinned) stands where it is and takes no
 * share of its side's end gap.
 *
 * A segment that moves lands on a whole px, or on the exact coordinate of the segment
 * it merges with; one that does not keeps its coordinate exactly.
 *
 * @param routes - In the edges' input order, which breaks ties; each path is
 *   rewritten in place and may lose points, but never its first or last
 * @param borders - Frames whose sides no segment moves across, as walls
 */
export const nudgeRoutes = (
	routes: readonly RouteToNudge[],
	borders: readonly BoundingBox[],
): void => {
	const context: NudgeContext = {
		routes,
		borders,
		endGaps: calcEndGaps(routes),
	};
	nudgeAlong({ ...context, isVertical: true });
	nudgeAlong({ ...context, isVertical: false });
	straightenJogs(context);
};
