import type { CreateDataType } from "./CreateDataType";
import type { DiagramFeatures } from "../../core/DiagramFeatures";

/**
 * Diagram features for Rectangle shapes.
 */
export const RectangleFeatures = {
	frameable: true,
	transformative: true,
	connectable: true,
	strokable: true,
	fillable: true,
	cornerRoundable: true,
	textable: true,
	selectable: true,
	fileDroppable: true,
} as const satisfies DiagramFeatures;

/**
 * Data type for rectangle shapes.
 * Contains properties specific to rectangular diagram elements.
 */
export type RectangleData = CreateDataType<typeof RectangleFeatures>;
