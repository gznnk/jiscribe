import type { PageDesignNodeData } from "../../../types/data/nodes/PageDesignNodeData";
import { PageDesignNodeFeatures } from "../../../types/data/nodes/PageDesignNodeData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is PageDesignNodeData.
 */
export const isPageDesignNodeData = createValidatorFromTypeAndFeatures(
	"PageDesignNode",
	PageDesignNodeFeatures,
) as (data: unknown) => data is PageDesignNodeData;
