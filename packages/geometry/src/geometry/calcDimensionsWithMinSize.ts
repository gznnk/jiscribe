/**
 * Applies optional minimum-size constraints to a width / height pair.
 *
 * @param width - Requested width
 * @param height - Requested height
 * @param minWidth - Lower bound for the width; undefined leaves it unconstrained
 * @param minHeight - Lower bound for the height; undefined leaves it unconstrained
 * @returns The constrained pair as `effectiveWidth` / `effectiveHeight`
 */
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
