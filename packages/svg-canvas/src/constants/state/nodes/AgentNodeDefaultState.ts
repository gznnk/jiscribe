import { AgentNodeFeatures } from "../../../types/data/nodes/AgentNodeData";
import type { AgentNodeState } from "../../../types/state/nodes/AgentNodeState";
import { AgentNodeDefaultData } from "../../data/nodes/AgentNodeDefaultData";
import { CreateDefaultState } from "../shapes/CreateDefaultState";

/**
 * Default agent node state template.
 */
export const AgentNodeDefaultState = CreateDefaultState<AgentNodeState>({
	type: "AgentNode",
	options: AgentNodeFeatures,
	baseData: AgentNodeDefaultData,
	properties: {},
});
