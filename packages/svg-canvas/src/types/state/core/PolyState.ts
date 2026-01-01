import type { PathPointState } from "../shapes/PathPointState";

/**
 * State type for polyline/polygon elements.
 */
export type PolyState = {
	points: PathPointState[];
};
