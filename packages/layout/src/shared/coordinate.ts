/**
 * Whether two coordinates are the same for routing purposes: an anchor placed by a
 * ratio of a width lands a float's tail off the column it was meant for.
 */
export const isSameCoordinate = (a: number, b: number): boolean =>
	Math.abs(a - b) < 1e-6;

/** `value` rounded up to whole px, a float's noise below a whole px left out. */
export const ceilCoordinate = (value: number): number => {
	const rounded = Math.round(value);
	return isSameCoordinate(value, rounded) ? rounded : Math.ceil(value);
};

/** `value` rounded down to whole px, a float's noise above a whole px left out. */
export const floorCoordinate = (value: number): number => {
	const rounded = Math.round(value);
	return isSameCoordinate(value, rounded) ? rounded : Math.floor(value);
};

/** Whether `value` reaches `bound`, a float's noise below it counting as reaching it. */
export const isAtLeast = (value: number, bound: number): boolean =>
	value > bound || isSameCoordinate(value, bound);

/** -1, 0 or 1 as `value` lies below, at or above 0, a float's noise counting as 0. */
export const signOf = (value: number): number =>
	isSameCoordinate(value, 0) ? 0 : Math.sign(value);
