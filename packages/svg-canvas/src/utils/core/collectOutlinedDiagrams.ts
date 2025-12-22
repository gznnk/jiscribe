import type { Frame } from "../../types/core/Frame";
import type { Diagram } from "../../types/state/core/Diagram";
import { isFrame } from "../validation/isFrame";
import { isItemableState } from "../validation/isItemableState";
import { isSelectableState } from "../validation/isSelectableState";

/**
 * Outline data structure containing frame properties for rendering
 */
export type OutlineData = Frame & {
	id: string;
};

/**
 * Recursively collects all diagrams that should show an outline.
 * Traverses the diagram tree and returns frame data for diagrams with showOutline=true.
 *
 * @param diagrams - Array of diagrams to search through
 * @returns Array of outline data containing id and frame properties
 */
export const collectOutlinedDiagrams = (diagrams: Diagram[]): OutlineData[] => {
	const outlines: OutlineData[] = [];

	for (const diagram of diagrams) {
		// Check if this diagram has showOutline=true and Frame properties
		if (
			isSelectableState(diagram) &&
			diagram.showOutline &&
			!diagram.outlineDisabled &&
			isFrame(diagram)
		) {
			outlines.push({
				id: diagram.id,
				x: diagram.x,
				y: diagram.y,
				width: diagram.width,
				height: diagram.height,
				rotation: diagram.rotation,
				scaleX: diagram.scaleX,
				scaleY: diagram.scaleY,
			});
		}

		// Recursively collect from nested items
		if (isItemableState(diagram)) {
			outlines.push(...collectOutlinedDiagrams(diagram.items));
		}
	}

	return outlines;
};
