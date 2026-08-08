/**
 * Converts NaN to zero, passing every other value through.
 *
 * @param value - Number to guard; only NaN is caught, so ±Infinity passes through
 */
export const nanToZero = (value: number): number => {
	return Number.isNaN(value) ? 0 : value;
};
