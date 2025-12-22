import { LLMNodeFeatures } from "../../../types/data/nodes/LLMNodeData";
import type { LLMNodeState } from "../../../types/state/nodes/LLMNodeState";
import { LLMNodeDefaultData } from "../../data/nodes/LLMNodeDefaultData";
import { MIN_WIDTH, MIN_HEIGHT } from "../../styling/nodes/LLMNodeStyling";
import { CreateDefaultState } from "../shapes/CreateDefaultState";

/**
 * Default LLM node state template.
 */
export const LLMNodeDefaultState = CreateDefaultState<LLMNodeState>({
	type: "LLMNode",
	options: LLMNodeFeatures,
	baseData: LLMNodeDefaultData,
	properties: {
		itemableType: "composite",
		minWidth: MIN_WIDTH,
		minHeight: MIN_HEIGHT,
	},
});
