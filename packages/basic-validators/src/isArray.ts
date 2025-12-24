/**
 * Check if value is an array.
 */
export const isArray = (value: unknown): value is unknown[] => {
	return Array.isArray(value);
};
