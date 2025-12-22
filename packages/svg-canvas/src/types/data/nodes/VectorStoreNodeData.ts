import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "../shapes/CreateDataType";

/**
 * Diagram features for VectorStore nodes.
 */
export const VectorStoreNodeFeatures = {
	frameable: true,
	transformative: true,
	connectable: true,
	cornerRoundable: false,
	selectable: true,
	executable: true,
} as const satisfies DiagramFeatures;

/**
 * Type of the VectorStoreNode data.
 */
export type VectorStoreNodeData = CreateDataType<
	typeof VectorStoreNodeFeatures
>;
