import { isBoolean } from "@workspace/basic-validators";

import { isTextableData } from "./isTextableData";
import type { TextableState } from "../../types/state/core/TextableState";

/**
 * Check if an object is TextableState.
 *
 * @param obj - The object to check
 * @returns True if the object is TextableState, false otherwise
 */
export const isTextableState = (obj: unknown): obj is TextableState => {
	return (
		isTextableData(obj) &&
		"isTextEditing" in obj &&
		isBoolean(obj.isTextEditing)
	);
};
