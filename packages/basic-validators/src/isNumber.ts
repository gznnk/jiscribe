/**
 * Type guard for `number`. `NaN` is rejected so callers can compare or do arithmetic
 * on the narrowed value without a second check.
 *
 * @param value - Value to narrow; `Infinity` / `-Infinity` pass, numeric strings do not
 */
export const isNumber = (value: unknown): value is number => {
	return typeof value === "number" && !Number.isNaN(value);
};
