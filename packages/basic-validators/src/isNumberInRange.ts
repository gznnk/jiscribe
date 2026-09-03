import { isNumber } from "./isNumber";

/**
 * Builds a type guard for a number inside a closed range.
 *
 * @param min - Lower bound, itself accepted as valid
 * @param max - Upper bound, itself accepted as valid; a `max` below `min` yields a guard that
 *   accepts nothing
 * @returns Type guard rejecting non-numbers, `NaN` and the infinities (see
 *   {@link isNumber})
 */
export const isNumberInRange =
	(min: number, max: number) =>
	(value: unknown): value is number => {
		return isNumber(value) && value >= min && value <= max;
	};
