import type { Diagram } from "../../../types/state/core/Diagram";
import { isImageState } from "../../../utils/validation/isImageState";

/**
 * Converts image data to a Blob.
 *
 * @param data - The diagram containing image data
 * @returns A Blob representing the image or undefined if not valid
 */
export const imageToBlob = (data: Diagram): Blob | undefined => {
	if (!isImageState(data)) return undefined;

	// 1. base64 → binary string
	const binary = atob(data.base64Data.replace(/\s/g, ""));

	// 2. binary string → Uint8Array
	const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));

	// 3. Convert to Blob
	return new Blob([bytes], { type: "image/png" });
};
