/**
 * Returns the sign of a number as either 1 or -1.
 * Unlike Math.sign, this never returns 0.
 *
 * @param value - Number to get the sign of
 * @returns 1 if value is zero or positive, -1 if value is negative
 */
export const signNonZero = (value: number): number => {
	return value >= 0 ? 1 : -1;
};
