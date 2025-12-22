import type { TextAreaNodeData } from "../../../types/data/nodes/TextAreaNodeData";
import { TextAreaNodeFeatures } from "../../../types/data/nodes/TextAreaNodeData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is TextAreaNodeData.
 */
export const isTextAreaNodeData = createValidatorFromTypeAndFeatures(
	"TextAreaNode",
	TextAreaNodeFeatures,
) as (data: unknown) => data is TextAreaNodeData;
