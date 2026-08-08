/**
 * Type guard for `boolean`.
 *
 * @param value - Value to narrow; only `true` / `false` pass, other truthy or falsy values
 *   such as `0` and `""` do not
 */
export const isBoolean = (value: unknown): value is boolean => {
	return typeof value === "boolean";
};
