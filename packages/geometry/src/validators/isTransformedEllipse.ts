import type { TransformedEllipse } from "../types/TransformedEllipse";
import { isEllipse } from "./isEllipse";
import { isTransform } from "./isTransform";

/**
 * Check if an object is a TransformedEllipse.
 * Validates both Ellipse and Transform properties.
 *
 * @param obj - The object to check
 * @returns True if the object is a TransformedEllipse, false otherwise
 */
export const isTransformedEllipse = (
	obj: unknown,
): obj is TransformedEllipse => {
	return isEllipse(obj) && isTransform(obj);
};
