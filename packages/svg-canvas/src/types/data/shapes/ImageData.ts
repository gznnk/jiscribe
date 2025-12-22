import type { CreateDataType } from "./CreateDataType";
import type { DiagramFeatures } from "../../core/DiagramFeatures";

/**
 * Diagram features for Image shapes.
 */
export const ImageFeatures = {
	frameable: true,
	transformative: true,
	cornerRoundable: false,
	selectable: true,
} as const satisfies DiagramFeatures;

/**
 * Data type for Image component.
 */
export type ImageData = CreateDataType<
	typeof ImageFeatures,
	{
		base64Data: string;
	}
>;
