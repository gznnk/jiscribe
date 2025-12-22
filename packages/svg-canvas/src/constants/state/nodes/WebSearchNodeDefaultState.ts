import { WebSearchNodeFeatures } from "../../../types/data/nodes/WebSearchNodeData";
import type { WebSearchNodeState } from "../../../types/state/nodes/WebSearchNodeState";
import { WebSearchNodeDefaultData } from "../../data/nodes/WebSearchNodeDefaultData";
import { CreateDefaultState } from "../shapes/CreateDefaultState";

/**
 * Default web search node state template.
 */
export const WebSearchNodeDefaultState = CreateDefaultState<WebSearchNodeState>(
	{
		type: "WebSearchNode",
		options: WebSearchNodeFeatures,
		baseData: WebSearchNodeDefaultData,
		properties: {},
	},
);
