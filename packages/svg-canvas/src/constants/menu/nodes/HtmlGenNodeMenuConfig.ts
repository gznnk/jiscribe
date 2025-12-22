import { HtmlGenNodeFeatures } from "../../../types/data/nodes/HtmlGenNodeData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for HtmlGenNode.
 * Menu options are enabled based on HtmlGenNodeFeatures.
 */
export const HtmlGenNodeMenuConfig: DiagramMenuConfig =
	createMenuConfig(HtmlGenNodeFeatures);
