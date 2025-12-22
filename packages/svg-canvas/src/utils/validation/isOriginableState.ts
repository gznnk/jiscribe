import { isOriginableData } from "./isOriginableData";
import type { OriginableData } from "../../types/data/core/OriginableData";

/**
 * Type guard to check if a diagram has origin properties.
 * Validates that the diagram has originX and originY properties with number type.
 *
 * @param diagram - The diagram to check
 * @returns True if the diagram has origin properties
 */
export const isOriginableState = (obj: unknown): obj is OriginableData => {
	return isOriginableData(obj);
};
