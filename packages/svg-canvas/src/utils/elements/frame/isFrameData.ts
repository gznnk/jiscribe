import type { FrameData } from "../../../types/data/elements/FrameData";
import { FrameFeatures } from "../../../types/data/elements/FrameData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is FrameData.
 */
export const isFrameData = createValidatorFromTypeAndFeatures(
	"Frame",
	FrameFeatures,
) as (data: unknown) => data is FrameData;
