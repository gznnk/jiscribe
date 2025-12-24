import { isCssColor, isString } from "@workspace/basic-validators";

import type { AiData } from "../../../types/data/diagrams/AiData";
import { AiFeatures } from "../../../types/data/diagrams/AiData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

const baseValidator = createValidatorFromTypeAndFeatures("Ai", AiFeatures);

/**
 * Check if data is valid Ai diagram data.
 * Uses the base validator from features and adds Ai-specific validations.
 */
export const isAiData = (data: unknown): data is AiData => {
	// Base validation from features
	if (!baseValidator(data)) return false;

	// Ai-specific validations
	const aiData = data as AiData;

	// avatarUrl is optional (if present, must be string)
	if ("avatarUrl" in aiData && aiData.avatarUrl !== undefined) {
		if (!isString(aiData.avatarUrl)) return false;
	}

	// avatarBgColor is required and must be valid color
	if (!("avatarBgColor" in aiData) || !isCssColor(aiData.avatarBgColor))
		return false;

	// bubbleBgColor is required and must be valid color
	if (!("bubbleBgColor" in aiData) || !isCssColor(aiData.bubbleBgColor))
		return false;

	// aiMessage is required and must be string
	if (!("aiMessage" in aiData) || !isString(aiData.aiMessage)) return false;

	return true;
};
