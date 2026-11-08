import { isSameCoordinate } from "./isSameCoordinate";

/** `value` rounded down to whole px, a float's noise above a whole px left out. */
export const floorCoordinate = (value: number): number => {
	const rounded = Math.round(value);
	return isSameCoordinate(value, rounded) ? rounded : Math.floor(value);
};
