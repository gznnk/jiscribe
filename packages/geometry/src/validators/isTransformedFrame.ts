import { isFrame } from "./isFrame";
import { isTransform } from "./isTransform";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Check if an object is a TransformedFrame.
 * Validates both Frame and Transform properties.
 *
 * @param obj - The object to check
 * @returns True if the object is a TransformedFrame, false otherwise
 */
export const isTransformedFrame = (obj: unknown): obj is TransformedFrame => {
	return isFrame(obj) && isTransform(obj);
};
