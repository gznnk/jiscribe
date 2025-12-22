import type { AgentNodeData } from "../../../types/data/nodes/AgentNodeData";
import { AgentNodeFeatures } from "../../../types/data/nodes/AgentNodeData";
import { CreateDefaultData } from "../shapes/CreateDefaultData";

/**
 * Default agent node data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const AgentNodeDefaultData = CreateDefaultData<AgentNodeData>({
	type: "AgentNode",
	options: AgentNodeFeatures,
	properties: {},
});
