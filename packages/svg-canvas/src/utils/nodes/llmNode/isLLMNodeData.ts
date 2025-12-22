import type { LLMNodeData } from "../../../types/data/nodes/LLMNodeData";
import { LLMNodeFeatures } from "../../../types/data/nodes/LLMNodeData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is LLMNodeData.
 */
export const isLLMNodeData = createValidatorFromTypeAndFeatures(
	"LLMNode",
	LLMNodeFeatures,
) as (data: unknown) => data is LLMNodeData;
