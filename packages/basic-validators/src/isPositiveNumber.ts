import { isNumber } from "./isNumber";

/**
 * Check if value is a positive number.
 */
export const isPositiveNumber = (value: unknown): value is number => {
	return isNumber(value) && value > 0;
};
