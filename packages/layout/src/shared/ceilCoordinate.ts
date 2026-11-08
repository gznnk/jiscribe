import { isSameCoordinate } from "./isSameCoordinate";

/** `value` rounded up to whole px, a float's noise below a whole px left out. */
export const ceilCoordinate = (value: number): number => {
	const rounded = Math.round(value);
	return isSameCoordinate(value, rounded) ? rounded : Math.ceil(value);
};
