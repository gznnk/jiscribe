import type { TransformedFrame } from "@workspace/geometry";

import { convertDiagramToFrame } from "./convertDiagramToFrame";
import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../validation/isItemableState";
import { isSelectableState } from "../validation/isSelectableState";

/**
 * Outline data structure containing frame properties for rendering
 */
export type OutlineData = TransformedFrame & {
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
		// Check if this diagram has showOutline=true
		if (
			isSelectableState(diagram) &&
			diagram.showOutline &&
			!diagram.outlineDisabled
		) {
			const frame = convertDiagramToFrame(diagram);
			if (frame) {
				outlines.push({
					id: diagram.id,
					cx: frame.cx,
					cy: frame.cy,
					width: frame.width,
					height: frame.height,
					rotation: frame.rotation,
					scaleX: frame.scaleX,
					scaleY: frame.scaleY,
				});
			}
		}

		// Recursively collect from nested items
		if (isItemableState(diagram)) {
			outlines.push(...collectOutlinedDiagrams(diagram.items));
		}
	}

	return outlines;
};
