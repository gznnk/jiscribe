import type { CreateDataType } from "./CreateDataType";
import type { DiagramFeatures } from "../../core/DiagramFeatures";

/**
 * Diagram features for PathPoint.
 */
export const PathPointFeatures = {
	geometry: "point",
	transformative: false,
	connectable: false,
	selectable: false,
} as const satisfies DiagramFeatures;

/**
 * Data type for path vertices.
 * Represents individual points that make up a path or polyline.
 */
export type PathPointData = CreateDataType<typeof PathPointFeatures>;
