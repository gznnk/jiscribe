import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "../shapes/CreateDataType";

/**
 * Diagram features for Input shapes.
 */
export const InputFeatures = {
	frameable: true,
	transformative: true,
	connectable: true,
	strokable: true,
	fillable: true,
	cornerRoundable: true,
	textable: true,
	selectable: true,
	fileDroppable: false,
} as const satisfies DiagramFeatures;

/**
 * Data type for Input shapes.
 * Contains properties specific to Input diagram elements.
 */
export type InputData = CreateDataType<typeof InputFeatures>;
