import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "../shapes/CreateDataType";

/**
 * Diagram features for WebSearch nodes.
 */
export const WebSearchNodeFeatures = {
	frameable: true,
	transformative: true,
	connectable: true,
	cornerRoundable: false,
	selectable: true,
	executable: true,
} as const satisfies DiagramFeatures;

/**
 * Type of the WebSearchNode data.
 */
export type WebSearchNodeData = CreateDataType<typeof WebSearchNodeFeatures>;
