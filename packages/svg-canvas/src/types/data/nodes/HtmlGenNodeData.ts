// Import types related to SvgCanvas.
import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "../shapes/CreateDataType";

/**
 * Diagram features for HTML Generation nodes.
 */
export const HtmlGenNodeFeatures = {
	frameable: true,
	transformative: false,
	itemable: false,
	connectable: true,
	strokable: false,
	fillable: false,
	cornerRoundable: false,
	selectable: true,
	textable: false,
	executable: true,
} as const satisfies DiagramFeatures;

/**
 * Type of the HTML Generation node data.
 */
export type HtmlGenNodeData = CreateDataType<typeof HtmlGenNodeFeatures>;
