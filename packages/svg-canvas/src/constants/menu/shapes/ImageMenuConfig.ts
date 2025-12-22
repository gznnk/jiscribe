import { ImageFeatures } from "../../../types/data/shapes/ImageData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for Image shapes.
 * Menu options are enabled based on ImageFeatures.
 */
export const ImageMenuConfig: DiagramMenuConfig =
	createMenuConfig(ImageFeatures);
