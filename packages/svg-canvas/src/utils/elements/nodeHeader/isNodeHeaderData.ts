import type { NodeHeaderData } from "../../../types/data/elements/NodeHeaderData";
import { NodeHeaderFeatures } from "../../../types/data/elements/NodeHeaderData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is NodeHeaderData.
 */
export const isNodeHeaderData = createValidatorFromTypeAndFeatures(
	"NodeHeader",
	NodeHeaderFeatures,
) as (data: unknown) => data is NodeHeaderData;
