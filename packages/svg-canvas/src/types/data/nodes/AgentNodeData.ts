import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "../shapes/CreateDataType";

/**
 * Diagram features for Agent nodes.
 */
export const AgentNodeFeatures = {
	frameable: true,
	transformative: true,
	connectable: true,
	strokable: true,
	fillable: true,
	cornerRoundable: false,
	textable: true,
	selectable: true,
	executable: true,
} as const satisfies DiagramFeatures;

/**
 * Type of the AgentNode data.
 */
export type AgentNodeData = CreateDataType<typeof AgentNodeFeatures>;
