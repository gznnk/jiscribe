import { isFillableData } from "./isFillableData";
import type { FillableState } from "../../types/state/core/FillableState";

/**
 * Check if an object is FillableState.
 *
 * @param obj - The object to check
 * @returns True if the object is FillableState, false otherwise
 */
export const isFillableState = (obj: unknown): obj is FillableState => {
	return isFillableData(obj);
};
