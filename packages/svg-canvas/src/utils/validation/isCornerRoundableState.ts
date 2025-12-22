import { isCornerRoundableData } from "./isCornerRoundableData";
import type { CornerRoundableState } from "../../types/state/core/CornerRoundableState";

/**
 * Check if an object is CornerRoundableState.
 *
 * @param obj - The object to check
 * @returns True if the object is CornerRoundableState, false otherwise
 */
export const isCornerRoundableState = (
	obj: unknown,
): obj is CornerRoundableState => {
	return isCornerRoundableData(obj);
};
