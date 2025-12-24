import { isString } from "@workspace/basic-validators";

import type { ImageData } from "../../../types/data/shapes/ImageData";
import { ImageFeatures } from "../../../types/data/shapes/ImageData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

const baseValidator = createValidatorFromTypeAndFeatures(
	"Image",
	ImageFeatures,
);

/**
 * Type guard to check if data is ImageData.
 *
 * @param data - The data to check
 * @returns True if the data is ImageData
 */
export const isImageData = (data: unknown): data is ImageData => {
	if (!baseValidator(data)) return false;

	return isString((data as ImageData).base64Data);
};
