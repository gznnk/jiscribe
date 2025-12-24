import { isNumber } from "./isNumber";

/**
 * Check if value is a non-negative number (>= 0).
 */
export const isNonNegativeNumber = (value: unknown): value is number => {
	return isNumber(value) && value >= 0;
};
