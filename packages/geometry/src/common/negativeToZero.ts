/** Clamps negative values to zero, passing every other value through. */
export const negativeToZero = (value: number): number => {
	return value < 0 ? 0 : value;
};
