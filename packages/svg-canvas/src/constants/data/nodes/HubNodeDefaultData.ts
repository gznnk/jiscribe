import type { HubNodeData } from "../../../types/data/nodes/HubNodeData";
import { HubNodeFeatures } from "../../../types/data/nodes/HubNodeData";
import { CreateDefaultData } from "../shapes/CreateDefaultData";

/**
 * Default hub node data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const HubNodeDefaultData = CreateDefaultData<HubNodeData>({
	type: "HubNode",
	options: HubNodeFeatures,
	properties: {},
});
