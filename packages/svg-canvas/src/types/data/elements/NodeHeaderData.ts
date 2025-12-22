import type React from "react";

import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "../shapes/CreateDataType";

/**
 * Diagram features for NodeHeader elements.
 */
export const NodeHeaderFeatures = {
	frameable: true,
	transformative: false,
	connectable: false,
	strokable: false,
	fillable: false,
	cornerRoundable: false,
	textable: true,
	selectable: true,
	fileDroppable: false,
} as const satisfies DiagramFeatures;

/**
 * Data type for NodeHeader elements.
 * Contains properties specific to NodeHeader diagram elements.
 */
export type NodeHeaderData = CreateDataType<
	typeof NodeHeaderFeatures,
	{
		/** Icon component to display */
		iconComponent?: React.ComponentType<{ size: number; color: string }>;
	}
>;
