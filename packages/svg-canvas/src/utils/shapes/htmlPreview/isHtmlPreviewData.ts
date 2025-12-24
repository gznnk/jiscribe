import { isString } from "@workspace/basic-validators";

import type { HtmlPreviewData } from "../../../types/data/shapes/HtmlPreviewData";
import { HtmlPreviewFeatures } from "../../../types/data/shapes/HtmlPreviewData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

const baseValidator = createValidatorFromTypeAndFeatures(
	"HtmlPreview",
	HtmlPreviewFeatures,
);

/**
 * Type guard to check if data is HtmlPreviewData.
 *
 * @param data - The data to check
 * @returns True if the data is HtmlPreviewData
 */
export const isHtmlPreviewData = (data: unknown): data is HtmlPreviewData => {
	if (!baseValidator(data)) return false;

	if (
		!("htmlContent" in (data as HtmlPreviewData)) ||
		!isString((data as HtmlPreviewData).htmlContent)
	) {
		return false;
	}

	return true;
};
