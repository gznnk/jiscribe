import { isString } from "./isString";

/**
 * Type guard for an array of strings in which no string appears twice.
 *
 * @param value - Value to narrow; an empty array passes, and strings are compared
 *   exactly (case- and whitespace-sensitive, never trimmed or normalized)
 */
export const isDistinctStringArray = (value: unknown): value is string[] => {
	return (
		Array.isArray(value) &&
		value.every(isString) &&
		new Set(value).size === value.length
	);
};
