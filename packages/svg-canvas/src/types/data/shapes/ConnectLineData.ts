import type { CreateDataType } from "./CreateDataType";
import type { ArrowHeadType } from "../../core/ArrowHeadType";
import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { PathType } from "../../core/PathType";

/**
 * Diagram features for ConnectLine shapes.
 */
export const ConnectLineFeatures = {
	frameable: true,
	transformative: false,
	itemable: true,
	strokable: true,
	cornerRoundable: false,
	selectable: true,
} as const satisfies DiagramFeatures;

/**
 * Data type for connection lines between diagram elements.
 */
export type ConnectLineData = CreateDataType<
	typeof ConnectLineFeatures,
	{
		pathType: PathType;
		startOwnerId: string;
		endOwnerId: string;
		autoRouting: boolean;
		startArrowHead?: ArrowHeadType;
		endArrowHead?: ArrowHeadType;
	}
>;
