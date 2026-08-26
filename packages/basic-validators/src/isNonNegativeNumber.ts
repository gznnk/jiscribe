import { isNumber } from "./isNumber";

/**
 * Type guard for a number greater than or equal to zero.
 *
 * @param value - Value to narrow; `0` and `-0` pass, while `NaN` and the infinities fail
 *   (see {@link isNumber})
 */
export const isNonNegativeNumber = (value: unknown): value is number => {
	return isNumber(value) && value >= 0;
};
