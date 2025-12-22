import type { CreateDataType } from "./CreateDataType";
import type { ArrowHeadType } from "../../core/ArrowHeadType";
import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { PathType } from "../../core/PathType";

/**
 * Diagram features for Path shapes.
 */
export const PathFeatures = {
	frameable: true,
	transformative: true,
	itemable: true,
	strokable: true,
	cornerRoundable: false,
	selectable: true,
} as const satisfies DiagramFeatures;

/**
 * Data type for polyline/path elements.
 */
export type PathData = CreateDataType<
	typeof PathFeatures,
	{
		pathType: PathType;
		startArrowHead?: ArrowHeadType;
		endArrowHead?: ArrowHeadType;
	}
>;
