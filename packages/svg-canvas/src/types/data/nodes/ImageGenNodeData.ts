import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "../shapes/CreateDataType";

/**
 * Diagram features for ImageGen nodes.
 */
export const ImageGenNodeFeatures = {
	frameable: true,
	transformative: true,
	connectable: true,
	cornerRoundable: false,
	selectable: true,
	executable: true,
} as const satisfies DiagramFeatures;

/**
 * Type of the ImageGenNode data.
 */
export type ImageGenNodeData = CreateDataType<typeof ImageGenNodeFeatures>;
