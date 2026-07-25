import { isNumber } from "./isNumber";

/**
 * Type guard for a number greater than zero.
 *
 * @param value - Value to narrow; `0` and `-0` are rejected, `Infinity` passes and `NaN`
 *   fails (see {@link isNumber})
 */
export const isPositiveNumber = (value: unknown): value is number => {
	return isNumber(value) && value > 0;
};
