import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "../shapes/CreateDataType";

/**
 * Diagram features for Button shapes.
 */
export const ButtonFeatures = {
	frameable: true,
	transformative: true, // Can be transformed (resize, rotate)
	connectable: true, // Can connect to other shapes
	strokable: true, // Has stroke properties
	fillable: true, // Has fill properties
	cornerRoundable: true, // Has corner radius properties
	textable: true, // Can contain text
	selectable: true, // Can be selected
	fileDroppable: false, // Can accept file drops
} as const satisfies DiagramFeatures;

/**
 * Data type for Button shapes.
 * Contains properties specific to Button diagram elements.
 */
export type ButtonData = CreateDataType<typeof ButtonFeatures>;
