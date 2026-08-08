/**
 * Type guard for an object with readable properties, narrowing to `Record<string, unknown>`
 * so fields can be probed with `in` and read without a cast.
 *
 * @param value - Value to narrow; `null`, arrays and functions are rejected, while class
 *   instances and built-ins such as `Date` / `Map` pass — the prototype is not inspected
 */
export const isObject = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
