import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "../shapes/CreateDataType";

/**
 * Diagram features for TextArea nodes.
 */
export const TextAreaNodeFeatures = {
	frameable: true,
	transformative: true,
	itemable: true,
	connectable: true,
	strokable: false,
	fillable: false,
	cornerRoundable: false,
	selectable: true,
	textable: false,
	executable: true,
} as const satisfies DiagramFeatures;

/**
 * Type of the TextAreaNode data.
 */
export type TextAreaNodeData = CreateDataType<typeof TextAreaNodeFeatures>;
