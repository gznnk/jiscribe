import type { CreateDiagramProps } from "./CreateDiagramProps";
import type { HtmlPreviewFeatures } from "../../data/shapes/HtmlPreviewData";
import type { HtmlPreviewState } from "../../state/shapes/HtmlPreviewState";

/**
 * Props for HtmlPreview component
 */
export type HtmlPreviewProps = CreateDiagramProps<
	HtmlPreviewState,
	typeof HtmlPreviewFeatures
>;
