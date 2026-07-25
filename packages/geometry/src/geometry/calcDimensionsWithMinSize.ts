/** Applies optional minimum-size constraints to a width / height pair. */
export const calcDimensionsWithMinSize = (
	width: number,
	height: number,
	minWidth?: number,
	minHeight?: number,
) => {
	const effectiveWidth =
		minWidth === undefined ? width : Math.max(width, minWidth);
	const effectiveHeight =
		minHeight === undefined ? height : Math.max(height, minHeight);

	return {
		effectiveWidth,
		effectiveHeight,
	};
};
