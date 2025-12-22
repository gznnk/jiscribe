import type { RectangleData } from "../../../types/data/shapes/RectangleData";
import { RectangleFeatures } from "../../../types/data/shapes/RectangleData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is RectangleData.
 */
export const isRectangleData = createValidatorFromTypeAndFeatures(
	"Rectangle",
	RectangleFeatures,
) as (data: unknown) => data is RectangleData;
