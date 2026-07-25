/** Applies optional minimum-size constraints to a width / height pair. */
export const calcDimensionsWithMinSize = (
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
