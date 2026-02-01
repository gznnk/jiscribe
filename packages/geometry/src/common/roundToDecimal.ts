/**
 * 数値を指定された小数点桁数に丸める
 *
 * @param value - 丸める数値
 * @param decimals - 小数点以下の桁数 (デフォルト: 2)
 * @returns 丸められた数値
 *
 * @example
 * roundToDecimal(123.456, 2) // 123.46
 * roundToDecimal(123.456, 1) // 123.5
 * roundToDecimal(123.456, 0) // 123
 */
export const roundToDecimal = (value: number, decimals = 2): number => {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
};
