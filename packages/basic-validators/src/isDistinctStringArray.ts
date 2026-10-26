import { isString } from "./isString";

/**
 * Type guard for an array of strings in which no string appears twice.
 *
 * @param value - Value to narrow; an empty array passes, a sparse array (`[,]`)
 *   is rejected because its holes read as `undefined`, and strings are compared
 *   exactly (case- and whitespace-sensitive, never trimmed or normalized)
 */
export const isDistinctStringArray = (value: unknown): value is string[] => {
	if (!Array.isArray(value)) {
		return false;
	}
	const seenStrings = new Set<string>();
	// Indexed rather than `every`, which skips the holes of a sparse array.
	for (let index = 0; index < value.length; index++) {
		const element: unknown = value[index];
		if (!isString(element) || seenStrings.has(element)) {
			return false;
		}
		seenStrings.add(element);
	}
	return true;
};
