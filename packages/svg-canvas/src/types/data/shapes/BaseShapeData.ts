import type { CreateDataType } from "./CreateDataType";
import type { DiagramFeatures } from "../../core/DiagramFeatures";

/**
 * Diagram features for BaseShape.
 * Includes the common interactive functionality set.
 */
export const BaseShapeFeatures = {
	frameable: true,
	transformative: true,
	connectable: true,
	textable: true,
	selectable: true,
} as const satisfies DiagramFeatures;

/**
 * Data type for base shape.
 * Contains properties for common interactive shape functionality.
 */
export type BaseShapeData = CreateDataType<typeof BaseShapeFeatures>;