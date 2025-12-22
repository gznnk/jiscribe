import { HubNodeFeatures } from "../../../types/data/nodes/HubNodeData";
import type { HubNodeState } from "../../../types/state/nodes/HubNodeState";
import { HubNodeDefaultData } from "../../data/nodes/HubNodeDefaultData";
import { CreateDefaultState } from "../shapes/CreateDefaultState";

/**
 * Default hub node state template.
 */
export const HubNodeDefaultState = CreateDefaultState<HubNodeState>({
	type: "HubNode",
	options: HubNodeFeatures,
	baseData: HubNodeDefaultData,
	properties: {},
});
