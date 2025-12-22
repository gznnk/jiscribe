import type { CreateStateType } from "./CreateStateType";
import type {
	HtmlPreviewData,
	HtmlPreviewFeatures,
} from "../../data/shapes/HtmlPreviewData";

/**
 * Type for the state of the HtmlPreview component.
 */
export type HtmlPreviewState = CreateStateType<
	HtmlPreviewData,
	typeof HtmlPreviewFeatures
>;
