import type {
	WebSearchNodeData,
	WebSearchNodeFeatures,
} from "../../data/nodes/WebSearchNodeData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for web search nodes.
 */
export type WebSearchNodeState = CreateStateType<
	WebSearchNodeData,
	typeof WebSearchNodeFeatures
>;
