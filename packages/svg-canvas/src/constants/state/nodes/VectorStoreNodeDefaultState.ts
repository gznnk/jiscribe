import { VectorStoreNodeFeatures } from "../../../types/data/nodes/VectorStoreNodeData";
import type { VectorStoreNodeState } from "../../../types/state/nodes/VectorStoreNodeState";
import { VectorStoreNodeDefaultData } from "../../data/nodes/VectorStoreNodeDefaultData";
import { CreateDefaultState } from "../shapes/CreateDefaultState";

/**
 * Default vector store node state template.
 */
export const VectorStoreNodeDefaultState =
	CreateDefaultState<VectorStoreNodeState>({
		type: "VectorStoreNode",
		options: VectorStoreNodeFeatures,
		baseData: VectorStoreNodeDefaultData,
		properties: {},
	});
