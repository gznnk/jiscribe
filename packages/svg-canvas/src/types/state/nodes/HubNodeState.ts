import type {
	HubNodeData,
	HubNodeFeatures,
} from "../../data/nodes/HubNodeData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for hub nodes.
 */
export type HubNodeState = CreateStateType<HubNodeData, typeof HubNodeFeatures>;
