import type {
	AgentNodeData,
	AgentNodeFeatures,
} from "../../data/nodes/AgentNodeData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for agent nodes.
 */
export type AgentNodeState = CreateStateType<
	AgentNodeData,
	typeof AgentNodeFeatures
>;
