/**
 * Check if value is a boolean.
 */
export const isBoolean = (value: unknown): value is boolean => {
	return typeof value === "boolean";
};
