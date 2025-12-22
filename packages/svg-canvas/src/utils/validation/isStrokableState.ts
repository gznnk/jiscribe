import { isStrokableData } from "./isStrokableData";
import type { StrokableState } from "../../types/state/core/StrokableState";

/**
 * Check if an object is StrokableState.
 *
 * @param obj - The object to check
 * @returns True if the object is StrokableState, false otherwise
 */
export const isStrokableState = (obj: unknown): obj is StrokableState => {
	return isStrokableData(obj);
};
