/**
 * Rounds a number to the given number of decimal places.
 * `roundToDecimal(123.456, 1) -> 123.5`
 */
export const roundToDecimal = (value: number, decimals = 2): number => {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
};
