/**
 * Rounds a number to the given number of decimal places.
 * `roundToDecimal(123.456, 1) -> 123.5`
 *
 * @param value - Number to round
 * @param decimals - Decimal places to keep; negative values round to tens,
 *   hundreds, and so on
 */
export const roundToDecimal = (value: number, decimals = 2): number => {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
};
