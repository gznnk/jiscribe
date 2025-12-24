import { isNumber } from "./isNumber";

/**
 * Check if value is a number within a specified range.
 */
export const isNumberInRange =
	(min: number, max: number) =>
	(value: unknown): value is number => {
		return isNumber(value) && value >= min && value <= max;
	};
