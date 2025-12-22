import type { WebSearchNodeData } from "../../../types/data/nodes/WebSearchNodeData";
import { WebSearchNodeFeatures } from "../../../types/data/nodes/WebSearchNodeData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is WebSearchNodeData.
 */
export const isWebSearchNodeData = createValidatorFromTypeAndFeatures(
	"WebSearchNode",
	WebSearchNodeFeatures,
) as (data: unknown) => data is WebSearchNodeData;
