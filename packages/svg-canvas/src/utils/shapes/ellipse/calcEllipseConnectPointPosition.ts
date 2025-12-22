import type { EllipseVertices } from "../../../types/core/EllipseVertices";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";
import { calcEllipseVertices } from "../../math/geometry/calcEllipseVertices";
import { isConnectableState } from "../../validation/isConnectableState";
import { isFrame } from "../../validation/isFrame";

/**
 * Calculate the position of the connection points of the ellipse.
 *
 * @param diagram - The diagram data of the ellipse.
 * @returns An array of connection point move data.
 */
export const calcEllipseConnectPointPosition = (
	diagram: Diagram,
): ConnectPointState[] => {
	if (!isConnectableState(diagram) || !isFrame(diagram)) return []; // Type guard.

	// Calculate the vertices of the ellipse.
	const vertices = calcEllipseVertices(diagram);

	// Create connection point move data.
	const newConnectPoints: ConnectPointState[] = [];
	for (const connectPointData of diagram.connectPoints) {
		const vertex = (vertices as EllipseVertices)[
			connectPointData.name as keyof EllipseVertices
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
