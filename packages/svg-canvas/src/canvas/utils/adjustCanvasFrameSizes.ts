import { adjustTargetDiagramSize } from "./adjustTargetDiagramSize";
import { applyFunctionRecursively } from "./applyFunctionRecursively";
import type { Diagram } from "../../types/state/core/Diagram";

/**
 * Recursively processes items and adjusts canvas frame sizes.
 * For items with itemableType === "canvas", applies adjustTargetDiagramSize.
 *
 * @param diagrams - Array of diagrams to process
 * @returns Updated diagrams array with adjusted canvas frames
 */
export const adjustCanvasFrameSizes = (diagrams: Diagram[]): Diagram[] => {
	return applyFunctionRecursively(diagrams, (item) => {
		return adjustTargetDiagramSize(item);
	});
};
