import type { CreateDataType } from "./CreateDataType";
import type { DiagramFeatures } from "../../core/DiagramFeatures";

/**
 * Diagram features for Ellipse shapes.
 */
export const EllipseFeatures = {
	frameable: true,
	transformative: true,
	connectable: true,
	strokable: true,
	fillable: true,
	cornerRoundable: false,
	textable: true,
	selectable: true,
	fileDroppable: true,
} as const satisfies DiagramFeatures;

/**
 * Data type for ellipse shapes.
 */
export type EllipseData = CreateDataType<typeof EllipseFeatures>;
