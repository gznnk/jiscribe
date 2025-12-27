import type { CreateDataType } from "./CreateDataType";
import type { DiagramFeatures } from "../../core/DiagramFeatures";

/**
 * Diagram features for ConnectPoint.
 */
export const ConnectPointFeatures = {
	geometry: "point",
	transformative: false,
	connectable: false,
	selectable: false,
} as const satisfies DiagramFeatures;

/**
 * Data type for connection points.
 * Defines properties for points where connections between diagram elements can be made.
 */
export type ConnectPointData = CreateDataType<
	typeof ConnectPointFeatures,
	{
		name: string;
	}
>;
