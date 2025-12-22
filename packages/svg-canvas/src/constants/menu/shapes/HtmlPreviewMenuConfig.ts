import { HtmlPreviewFeatures } from "../../../types/data/shapes/HtmlPreviewData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for HtmlPreview.
 */
export const HtmlPreviewMenuConfig: DiagramMenuConfig =
	createMenuConfig(HtmlPreviewFeatures);
