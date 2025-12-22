import type { HubNodeData } from "../../../types/data/nodes/HubNodeData";
import { HubNodeFeatures } from "../../../types/data/nodes/HubNodeData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is HubNodeData.
 */
export const isHubNodeData = createValidatorFromTypeAndFeatures(
	"HubNode",
	HubNodeFeatures,
) as (data: unknown) => data is HubNodeData;
