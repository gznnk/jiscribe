/** Returns the sign of a number as 1 or -1. Unlike `Math.sign`, zero yields 1. */
export const calcNonZeroSign = (value: number): 1 | -1 => {
	return value >= 0 ? 1 : -1;
};
