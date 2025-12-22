import type { DiagramBaseData } from "../core/DiagramBaseData";

/**
 * Data type for connection points.
 * Defines properties for points where connections between diagram elements can be made.
 */
export type ConnectPointData = DiagramBaseData & {
	name: string;
};
