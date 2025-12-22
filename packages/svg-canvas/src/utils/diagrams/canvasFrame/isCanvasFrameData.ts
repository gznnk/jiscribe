import type { CanvasFrameData } from "../../../types/data/diagrams/CanvasFrameData";
import { CanvasFrameFeatures } from "../../../types/data/diagrams/CanvasFrameData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Check if data is valid CanvasFrame diagram data.
 * Uses the base validator from features.
 */
export const isCanvasFrameData = createValidatorFromTypeAndFeatures(
	"CanvasFrame",
	CanvasFrameFeatures,
) as (data: unknown) => data is CanvasFrameData;
