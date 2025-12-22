import type { VectorStoreNodeData } from "../../../types/data/nodes/VectorStoreNodeData";
import { VectorStoreNodeFeatures } from "../../../types/data/nodes/VectorStoreNodeData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is VectorStoreNodeData.
 */
export const isVectorStoreNodeData = createValidatorFromTypeAndFeatures(
	"VectorStoreNode",
	VectorStoreNodeFeatures,
) as (data: unknown) => data is VectorStoreNodeData;
