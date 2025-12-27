import { calcRectangleVertices, isRect } from "@workspace/geometry";

import type { RectangleVertices } from "../../../types/core/RectangleVertices";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";
import { isConnectableState } from "../../validation/isConnectableState";

/**
 * Calculate the position of the connection points of the rectangle.
 *
 * @param diagram - The diagram data of the rectangle.
 * @returns An array of connection point move data.
 */
export const calcRectangleConnectPointPosition = (
	diagram: Diagram,
): ConnectPointState[] => {
	if (!isRect(diagram)) return []; // Type guard.
	if (!isConnectableState(diagram)) return []; // Type guard.

	// Calculate the vertices of the rectangle.
	const vertices = calcRectangleVertices(diagram);

	// Create connection point move data.
	const newConnectPoints: ConnectPointState[] = [];
	for (const connectPointData of diagram.connectPoints) {
		const vertex = (vertices as RectangleVertices)[
			connectPointData.name as keyof RectangleVertices
		];

		newConnectPoints.push({
			id: connectPointData.id,
			type: "ConnectPoint",
			geometryType: "point",
			name: connectPointData.name,
			x: vertex.x,
			y: vertex.y,
			isDragging: false,
		});
	}

	return newConnectPoints;
};
