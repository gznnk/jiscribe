import { isString } from "./isString";

/**
 * Type guard for a string carrying non-whitespace content.
 *
 * @param value - Value to narrow; whitespace-only strings such as `" "` or `"\n"` are rejected,
 *   and the value itself is never trimmed
 */
export const isNonEmptyString = (value: unknown): value is string => {
	return isString(value) && value.trim() !== "";
};
