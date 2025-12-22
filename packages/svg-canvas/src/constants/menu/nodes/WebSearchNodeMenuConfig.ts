import { WebSearchNodeFeatures } from "../../../types/data/nodes/WebSearchNodeData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for WebSearchNode.
 * Menu options are enabled based on WebSearchNodeFeatures.
 */
export const WebSearchNodeMenuConfig: DiagramMenuConfig = createMenuConfig(
	WebSearchNodeFeatures,
);
