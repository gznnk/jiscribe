import type {
	VectorStoreNodeData,
	VectorStoreNodeFeatures,
} from "../../data/nodes/VectorStoreNodeData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for vector store nodes.
 */
export type VectorStoreNodeState = CreateStateType<
	VectorStoreNodeData,
	typeof VectorStoreNodeFeatures
>;
