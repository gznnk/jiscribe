/** Converts NaN to zero, passing every other value through. */
export const nanToZero = (value: number): number => {
	return Number.isNaN(value) ? 0 : value;
};
