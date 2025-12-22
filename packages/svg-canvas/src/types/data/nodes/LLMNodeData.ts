// Import types related to SvgCanvas.
import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "../shapes/CreateDataType";

/**
 * Diagram features for LLM nodes.
 */
export const LLMNodeFeatures = {
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
 * Type of the LLM node data.
 */
export type LLMNodeData = CreateDataType<typeof LLMNodeFeatures>;
