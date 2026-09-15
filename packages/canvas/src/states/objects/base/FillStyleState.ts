/**
 * Properties related to fill styling (runtime state).
 */
export type FillStyleState = {
	/** Fill color (CSS color string). */
	fill?: string;
	/** Fill opacity from 0 (invisible) to 1 (opaque), multiplying the color's own alpha. */
	fillOpacity?: number;
};
