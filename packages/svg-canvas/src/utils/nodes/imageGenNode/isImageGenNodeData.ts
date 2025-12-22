import type { ImageGenNodeData } from "../../../types/data/nodes/ImageGenNodeData";
import { ImageGenNodeFeatures } from "../../../types/data/nodes/ImageGenNodeData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is ImageGenNodeData.
 */
export const isImageGenNodeData = createValidatorFromTypeAndFeatures(
	"ImageGenNode",
	ImageGenNodeFeatures,
) as (data: unknown) => data is ImageGenNodeData;
