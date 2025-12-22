import type { StickyData } from "../../../types/data/diagrams/StickyData";
import { StickyFeatures } from "../../../types/data/diagrams/StickyData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Check if data is valid Sticky diagram data.
 * Uses the base validator from features.
 */
export const isStickyData = createValidatorFromTypeAndFeatures(
	"Sticky",
	StickyFeatures,
) as (data: unknown) => data is StickyData;
