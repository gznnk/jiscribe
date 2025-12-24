import { isString } from "./isString";

/**
 * Check if value is a non-empty string.
 */
export const isNonEmptyString = (value: unknown): value is string => {
	return isString(value) && value.trim() !== "";
};
