import { isString } from "./isString";

/**
 * Check if value is a valid CSS color using CSS.supports.
 * This is more accurate than regex as it uses the browser's native CSS parser.
 */
export const isCssColor = (value: unknown): value is string => {
	if (!isString(value)) return false;

	// Use CSS.supports to check if the color value is valid
	return CSS.supports("color", value);
};
