import { calcDiagramBoundingBox } from "./calcDiagramBoundingBox";
import type { Box } from "../../../types/core/Box";
import type { Diagram } from "../../../types/state/core/Diagram";

/**
 * Calculate the bounding box of all provided diagrams.
 *
 * @param diagrams - The list of diagrams to calculate the bounding box for.
 * @returns The bounding box that encompasses all provided diagrams.
 */
export const calcDiagramsBoundingBox = (diagrams: Diagram[]): Box => {
	if (diagrams.length === 0) {
		return {
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
		};
	}

	const box = {
		top: Number.MAX_VALUE,
		left: Number.MAX_VALUE,
		right: Number.MIN_VALUE,
		bottom: Number.MIN_VALUE,
	};

	for (const diagram of diagrams) {
		const diagramBox = calcDiagramBoundingBox(diagram);
		box.top = Math.min(box.top, diagramBox.top);
		box.left = Math.min(box.left, diagramBox.left);
		box.right = Math.max(box.right, diagramBox.right);
		box.bottom = Math.max(box.bottom, diagramBox.bottom);
	}

	return box;
};
