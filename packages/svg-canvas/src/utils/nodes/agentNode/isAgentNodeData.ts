import type { AgentNodeData } from "../../../types/data/nodes/AgentNodeData";
import { AgentNodeFeatures } from "../../../types/data/nodes/AgentNodeData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is AgentNodeData.
 */
export const isAgentNodeData = createValidatorFromTypeAndFeatures(
	"AgentNode",
	AgentNodeFeatures,
) as (data: unknown) => data is AgentNodeData;
