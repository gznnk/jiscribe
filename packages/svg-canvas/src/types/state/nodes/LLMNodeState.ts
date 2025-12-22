import type {
	LLMNodeData,
	LLMNodeFeatures,
} from "../../data/nodes/LLMNodeData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for LLM nodes.
 */
export type LLMNodeState = CreateStateType<LLMNodeData, typeof LLMNodeFeatures>;
