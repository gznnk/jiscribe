import { isPolyData } from "./isPolyData";
import type { PolyData } from "../../types/data/core/PolyData";

/**
 * Check if an object is PolyState.
 * Since PolyState has no non-persistent keys, this directly extends the data type check.
 *
 * @param obj - The object to check
 * @returns True if the object is PolyState, false otherwise
 */
export const isPolyState = (obj: unknown): obj is PolyData => {
	return isPolyData(obj);
};
