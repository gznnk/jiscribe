import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "../shapes/CreateDataType";

/**
 * Diagram features for PageDesign nodes.
 */
export const PageDesignNodeFeatures = {
	frameable: true,
	transformative: true,
	connectable: true,
	cornerRoundable: false,
	selectable: true,
	executable: true,
} as const satisfies DiagramFeatures;

/**
 * Type of the PageDesignNode data.
 */
export type PageDesignNodeData = CreateDataType<typeof PageDesignNodeFeatures>;
