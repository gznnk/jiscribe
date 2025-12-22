import type { ButtonData } from "../../../types/data/elements/ButtonData";
import { ButtonFeatures } from "../../../types/data/elements/ButtonData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is ButtonData.
 */
export const isButtonData = createValidatorFromTypeAndFeatures(
	"Button",
	ButtonFeatures,
) as (data: unknown) => data is ButtonData;
