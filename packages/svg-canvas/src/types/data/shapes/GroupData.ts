import type { CreateDataType } from "./CreateDataType";
import type { DiagramFeatures } from "../../core/DiagramFeatures";

/**
 * Diagram features for Group shapes.
 */
export const GroupFeatures = {
	frameable: true,
	transformative: true,
	itemable: true,
	cornerRoundable: false,
	selectable: true,
} as const satisfies DiagramFeatures;

/**
 * Data type for grouped diagram elements.
 * Implements selectable, transformative, and itemable behaviors to manage collections of elements.
 */
export type GroupData = CreateDataType<typeof GroupFeatures>;
