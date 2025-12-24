/**
 * Returns the number from two options that is closer to a reference value.
 *
 * @param value - Reference value to compare against
 * @param a - First number to compare
 * @param b - Second number to compare
 * @returns The number (either a or b) that is closer to the reference value
 */
export const closer = (value: number, a: number, b: number): number => {
	return Math.abs(value - a) <= Math.abs(value - b) ? a : b;
};
