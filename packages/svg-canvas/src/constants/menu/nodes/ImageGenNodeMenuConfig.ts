import { ImageGenNodeFeatures } from "../../../types/data/nodes/ImageGenNodeData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for ImageGenNode.
 * Menu options are enabled based on ImageGenNodeFeatures.
 */
export const ImageGenNodeMenuConfig: DiagramMenuConfig =
	createMenuConfig(ImageGenNodeFeatures);
