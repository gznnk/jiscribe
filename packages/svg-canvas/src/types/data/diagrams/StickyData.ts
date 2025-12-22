import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "../shapes/CreateDataType";

/**
 * Diagram features for Sticky diagrams.
 */
export const StickyFeatures = {
	frameable: true,
	transformative: true,
	connectable: false,
	strokable: true,
	fillable: true,
	cornerRoundable: false,
	textable: true,
	selectable: true,
	fileDroppable: false,
} as const satisfies DiagramFeatures;

/**
 * Data type for Sticky diagrams.
 * Contains properties specific to sticky note diagram elements.
 */
export type StickyData = CreateDataType<typeof StickyFeatures>;