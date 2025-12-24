/**
 * Check if value is an object (not null, not array).
 */
export const isObject = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
