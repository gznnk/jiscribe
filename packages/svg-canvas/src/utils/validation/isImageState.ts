import { isNumber, isObject, isString } from "@workspace/validation";

import type { Diagram } from "../../types/state/core/Diagram";
import type { ImageState } from "../../types/state/shapes/ImageState";

// TODO: Add validation for all properties
/**
 * Type guard to check if a diagram is an image data object.
 *
 * @param data - The diagram to check
 * @returns True if the diagram is an image data object
 */
export const isImageState = (data: Diagram): data is ImageState => {
	if (!isObject(data)) return false;

	return (
		"type" in data &&
		data.type === "Image" &&
		"width" in data &&
		isNumber(data.width) &&
		"height" in data &&
		isNumber(data.height) &&
		"base64Data" in data &&
		isString(data.base64Data)
	);
};
