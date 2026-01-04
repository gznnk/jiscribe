import type { TransformedRect } from "../types/TransformedRect";
import { isRect } from "./isRect";
import { isTransform } from "./isTransform";

/**
 * Check if an object is a TransformedRect.
 * Validates both Rect and Transform properties.
 *
 * @param obj - The object to check
 * @returns True if the object is a TransformedRect, false otherwise
 */
export const isTransformedRect = (obj: unknown): obj is TransformedRect => {
	return isRect(obj) && isTransform(obj);
};
