import type {
	PageDesignNodeData,
	PageDesignNodeFeatures,
} from "../../data/nodes/PageDesignNodeData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for page design nodes.
 */
export type PageDesignNodeState = CreateStateType<
	PageDesignNodeData,
	typeof PageDesignNodeFeatures
>;
