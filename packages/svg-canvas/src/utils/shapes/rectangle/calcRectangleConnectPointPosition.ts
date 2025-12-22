import type { Frame } from "../../../types/core/Frame";
import type { RectangleVertices } from "../../../types/core/RectangleVertices";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";
import { calcRectangleVertices } from "../../../utils/math/geometry/calcRectangleVertices";
import { isConnectableState } from "../../validation/isConnectableState";
import { isFrame } from "../../validation/isFrame";

/**
 * Calculate the position of the connection points of the rectangle.
 *
 * @param diagram - The diagram data of the rectangle.
 * @returns An array of connection point move data.
 */
export const calcRectangleConnectPointPosition = (
	diagram: Diagram,
): ConnectPointState[] => {
	if (!isFrame(diagram)) return []; // Type guard.
	if (!isConnectableState(diagram)) return []; // Type guard.

	// Calculate the vertices of the rectangle.
	const vertices = calcRectangleVertices(diagram as Frame);

	// Create connection point move data.
	const newConnectPoints: ConnectPointState[] = [];
	for (const connectPointData of diagram.connectPoints) {
		const vertex = (vertices as RectangleVertices)[
			connectPointData.name as keyof RectangleVertices
		];

		newConnectPoints.push({
			id: connectPointData.id,
			type: "ConnectPoint",
			name: connectPointData.name,
			x: vertex.x,
			y: vertex.y,
			isDragging: false,
		});
	}

	return newConnectPoints;
};
