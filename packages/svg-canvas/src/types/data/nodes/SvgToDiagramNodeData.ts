import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "../shapes/CreateDataType";

/**
 * Diagram features for SvgToDiagram nodes.
 */
export const SvgToDiagramNodeFeatures = {
	frameable: true,
	transformative: true,
	connectable: true,
	cornerRoundable: false,
	selectable: true,
	executable: true,
} as const satisfies DiagramFeatures;

/**
 * Type of the SvgToDiagramNode data.
 */
export type SvgToDiagramNodeData = CreateDataType<
	typeof SvgToDiagramNodeFeatures
>;
