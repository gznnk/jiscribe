import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "../shapes/CreateDataType";

/**
 * Diagram features for Hub nodes.
 */
export const HubNodeFeatures = {
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
 * Type of the hub node data.
 */
export type HubNodeData = CreateDataType<typeof HubNodeFeatures>;
