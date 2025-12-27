import {
	calcBoundingBox,
	isPoint,
	type BoundingBox,
} from "@workspace/geometry";

import type { Diagram } from "../../types/state/core/Diagram";
import { convertDiagramToFrame } from "../core/convertDiagramToFrame";
import { convertDiagramToPoint } from "../core/convertDiagramToPoint";

/**
 * Calculate the bounding box of a single diagram.
 *
 * @param diagram - The diagram to calculate the bounding box for.
 * @returns The bounding box that encompasses the diagram.
 */
export const calcDiagramBoundingBox = (diagram: Diagram): BoundingBox => {
	// If the diagram is a point, return a point box at its coordinates
	if (isPoint(diagram)) {
		const point = convertDiagramToPoint(diagram);
		if (point) {
			return {
				top: point.y,
				left: point.x,
				right: point.x,
				bottom: point.y,
			};
		}
	}

	// Otherwise, try to convert to frame and calculate bounding box
	const frame = convertDiagramToFrame(diagram);
	if (frame) {
		return calcBoundingBox(frame);
	}

	// If the diagram cannot be converted to a frame or point, return a point box at origin
	return {
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	};
};
