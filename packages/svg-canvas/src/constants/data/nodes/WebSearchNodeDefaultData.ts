import type { WebSearchNodeData } from "../../../types/data/nodes/WebSearchNodeData";
import { WebSearchNodeFeatures } from "../../../types/data/nodes/WebSearchNodeData";
import { CreateDefaultData } from "../shapes/CreateDefaultData";

/**
 * Default web search node data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const WebSearchNodeDefaultData = CreateDefaultData<WebSearchNodeData>({
	type: "WebSearchNode",
	options: WebSearchNodeFeatures,
	properties: {},
});
