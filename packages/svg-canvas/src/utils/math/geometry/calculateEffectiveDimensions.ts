/**
 * Calculates effective dimensions using minimum constraints
 * @param width - The base width
 * @param height - The base height
 * @param minWidth - The minimum width constraint (optional)
 * @param minHeight - The minimum height constraint (optional)
 * @returns Object containing effectiveWidth and effectiveHeight
 */
export const calculateEffectiveDimensions = (
	width: number,
	height: number,
	minWidth?: number,
	minHeight?: number,
) => {
	const effectiveWidth = minWidth ? Math.max(width, minWidth) : width;
	const effectiveHeight = minHeight ? Math.max(height, minHeight) : height;

	return {
		effectiveWidth,
		effectiveHeight,
	};
};
