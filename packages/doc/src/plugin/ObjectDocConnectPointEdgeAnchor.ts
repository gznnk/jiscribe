import type { ObjectDoc } from "../model/objects/base/ObjectDoc";
import type { EdgeAnchorSide } from "../model/objects/types/EndpointRef";

/** Where one declared connect point sits on its type's untransformed box. */
export type ObjectDocConnectPointEdgeAnchor = {
	/** The connect point's id, one of the type's `extraConnectPointIds` for the doc. */
	id: string;
	/** The side of the box the point lies on, which a line leaves it through. */
	side: EdgeAnchorSide;
	/**
	 * The point's place along that side of the box, 0 at its left or top end and 1 at
	 * its right or bottom end: the ratio of the box itself, not of the type's anchor
	 * region, which an edge anchor's `t` is measured along.
	 */
	t: number;
	/**
	 * Names the thing the point is one of several places to reach (an ER column, whose
	 * row ends on both edges). Routing an end on one point of a group may move it to
	 * another point of the same group. Left out, the point has no alternative.
	 */
	alternateGroup?: string;
};

/**
 * Answers the edge position each declared connect point of a doc is equivalent to
 * (see `ObjectDocDefinition.extraConnectPointEdgeAnchors`), in the order the type
 * declares them.
 */
export type ObjectDocConnectPointEdgeAnchorsCalculator = (
	doc: ObjectDoc,
) => readonly ObjectDocConnectPointEdgeAnchor[];
