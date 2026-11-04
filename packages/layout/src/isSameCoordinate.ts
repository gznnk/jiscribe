/**
 * Whether two coordinates are the same for routing purposes: an anchor placed by a
 * ratio of a width lands a float's tail off the column it was meant for.
 */
export const isSameCoordinate = (a: number, b: number): boolean =>
	Math.abs(a - b) < 1e-6;
