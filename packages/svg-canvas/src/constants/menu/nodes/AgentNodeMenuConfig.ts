import { AgentNodeFeatures } from "../../../types/data/nodes/AgentNodeData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for AgentNode.
 * Menu options are enabled based on AgentNodeFeatures.
 */
export const AgentNodeMenuConfig: DiagramMenuConfig =
	createMenuConfig(AgentNodeFeatures);
