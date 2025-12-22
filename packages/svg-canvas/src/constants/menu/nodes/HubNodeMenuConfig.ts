import { HubNodeFeatures } from "../../../types/data/nodes/HubNodeData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for HubNode.
 * Menu options are enabled based on HubNodeFeatures.
 */
export const HubNodeMenuConfig: DiagramMenuConfig =
	createMenuConfig(HubNodeFeatures);
