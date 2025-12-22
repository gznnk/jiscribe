import { LLMNodeFeatures } from "../../../types/data/nodes/LLMNodeData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for LLMNode.
 * Menu options are enabled based on LLMNodeFeatures.
 */
export const LLMNodeMenuConfig: DiagramMenuConfig =
	createMenuConfig(LLMNodeFeatures);
