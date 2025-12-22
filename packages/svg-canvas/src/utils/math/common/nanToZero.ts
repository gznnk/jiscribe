/**
 * Converts NaN values to zero.
 *
 * @param value - Number to check and potentially convert
 * @returns The original value or zero if the value was NaN
 */
export const nanToZero = (value: number): number => {
	return Number.isNaN(value) ? 0 : value;
};
