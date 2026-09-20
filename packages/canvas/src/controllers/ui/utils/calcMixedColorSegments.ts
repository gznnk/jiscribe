/**
 * How many colors of a selection that disagrees a swatch is split between. The
 * ones past it are left out: a fourth slice is too thin to read at icon size.
 */
export const MAX_MIXED_COLOR_SEGMENTS = 3;

/** One slice of a swatch drawn for a selection that disagrees on its color. */
export type MixedColorSegment = {
	/** The color the slice is painted in, as it was handed over. */
	color: string;
	/** Where the slice begins, as a fraction 0..1 of the whole swatch. */
	start: number;
	/** Where the slice ends, as a fraction 0..1 of the whole swatch. */
	end: number;
};

/**
 * Splits a swatch evenly between the colors of a selection that disagrees,
 * keeping the first MAX_MIXED_COLOR_SEGMENTS of them. What the fractions run
 * along is the caller's: an angle round a circle, a width across a bar.
 *
 * @param colors - The colors in the order they are drawn in (a SelectionValue's `values`); an empty list yields no slices
 * @returns One slice per color kept, in order, together covering 0..1 without gaps
 */
export const calcMixedColorSegments = (
	colors: readonly string[],
): MixedColorSegment[] => {
	const shownColors = colors.slice(0, MAX_MIXED_COLOR_SEGMENTS);
	return shownColors.map((color, index) => ({
		color,
		start: index / shownColors.length,
		end: (index + 1) / shownColors.length,
	}));
};
