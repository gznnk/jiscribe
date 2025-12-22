import type { CreateDataType } from "./CreateDataType";
import type { DiagramFeatures } from "../../core/DiagramFeatures";

/**
 * Diagram features for Svg shapes.
 */
export const SvgFeatures = {
	frameable: true,
	transformative: true,
	cornerRoundable: false,
	selectable: true,
} as const satisfies DiagramFeatures;

/**
 * Type for the data of the Svg component.
 */
export type SvgData = CreateDataType<
	typeof SvgFeatures,
	{
		initialWidth: number;
		initialHeight: number;
		svgText: string;
	}
>;
