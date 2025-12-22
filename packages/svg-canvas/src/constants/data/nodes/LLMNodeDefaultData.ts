import type { LLMNodeData } from "../../../types/data/nodes/LLMNodeData";
import { LLMNodeFeatures } from "../../../types/data/nodes/LLMNodeData";
import { CreateDefaultData } from "../shapes/CreateDefaultData";

/**
 * Default LLM node data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const LLMNodeDefaultData = CreateDefaultData<LLMNodeData>({
	type: "LLMNode",
	options: LLMNodeFeatures,
	properties: {
		width: 200,
		height: 200,
	},
});
