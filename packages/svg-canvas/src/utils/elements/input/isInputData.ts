import type { InputData } from "../../../types/data/elements/InputData";
import { InputFeatures } from "../../../types/data/elements/InputData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is InputData.
 */
export const isInputData = createValidatorFromTypeAndFeatures(
	"Input",
	InputFeatures,
) as (data: unknown) => data is InputData;
