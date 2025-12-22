import type { GroupData } from "../../../types/data/shapes/GroupData";
import { GroupFeatures } from "../../../types/data/shapes/GroupData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is GroupData.
 */
export const isGroupData = createValidatorFromTypeAndFeatures(
	"Group",
	GroupFeatures,
) as (data: unknown) => data is GroupData;
