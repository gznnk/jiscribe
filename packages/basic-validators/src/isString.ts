/**
 * Type guard for `string`.
 *
 * @param value - Value to narrow; primitive strings only, `new String()` wrapper objects fail
 */
export const isString = (value: unknown): value is string => {
	return typeof value === "string";
};
