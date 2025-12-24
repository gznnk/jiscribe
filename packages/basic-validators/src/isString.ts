/**
 * Check if value is a string.
 */
export const isString = (value: unknown): value is string => {
	return typeof value === "string";
};
