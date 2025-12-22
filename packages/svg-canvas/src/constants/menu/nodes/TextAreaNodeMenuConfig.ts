import { TextAreaNodeFeatures } from "../../../types/data/nodes/TextAreaNodeData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for TextAreaNode.
 * Menu options are enabled based on TextAreaNodeFeatures.
 */
export const TextAreaNodeMenuConfig: DiagramMenuConfig =
	createMenuConfig(TextAreaNodeFeatures);
