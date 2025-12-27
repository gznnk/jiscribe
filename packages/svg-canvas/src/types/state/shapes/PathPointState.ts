import type { PathPointData } from "../../data/shapes/PathPointData";
import type { DiagramBaseState } from "../core/DiagramBaseState";

/**
 * State type for path vertices.
 * Represents individual points that make up a path or polyline.
 */
export type PathPointState = PathPointData &
	DiagramBaseState & {
		geometryType: "point";
	};
