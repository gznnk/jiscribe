import type { PathPointData } from "../../../types/data/shapes/PathPointData";
import { DiagramBaseDefaultData } from "../core/DiagramBaseDefaultData";
import { PointDefaultData } from "../core/PointDefaultData";

/**
 * Default path point data template.
 * Used for State to Data conversion mapping.
 */
export const PathPointDefaultData = {
	...DiagramBaseDefaultData,
	...PointDefaultData,
	type: "PathPoint",
	geometryType: "point",
} as const satisfies PathPointData;
