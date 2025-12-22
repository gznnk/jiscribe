import type { CreateDataType } from "./CreateDataType";
import type { DiagramFeatures } from "../../core/DiagramFeatures";

/**
 * Diagram features for HtmlPreview shapes.
 */
export const HtmlPreviewFeatures = {
	frameable: true,
	transformative: true,
	cornerRoundable: false,
	selectable: true,
} as const satisfies DiagramFeatures;

/**
 * Type for the data of the HtmlPreview component.
 */
export type HtmlPreviewData = CreateDataType<
	typeof HtmlPreviewFeatures,
	{
		htmlContent: string;
	}
>;
