import type { HtmlGenNodeData } from "../../../types/data/nodes/HtmlGenNodeData";
import { HtmlGenNodeFeatures } from "../../../types/data/nodes/HtmlGenNodeData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is HtmlGenNodeData.
 */
export const isHtmlGenNodeData = createValidatorFromTypeAndFeatures(
	"HtmlGenNode",
	HtmlGenNodeFeatures,
) as (data: unknown) => data is HtmlGenNodeData;
