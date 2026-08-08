/**
 * Clamps negative values to zero, passing every other value through.
 *
 * @param value - Number to clamp; NaN is not negative, so it passes through
 */
export const negativeToZero = (value: number): number => {
	return value < 0 ? 0 : value;
};
