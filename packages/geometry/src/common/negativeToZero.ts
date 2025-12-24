/**
 * Converts negative values to zero.
 *
 * @param value - Number to check and potentially convert
 * @returns The original value or zero if the value was negative
 */
export const negativeToZero = (value: number): number => {
	return value < 0 ? 0 : value;
};
