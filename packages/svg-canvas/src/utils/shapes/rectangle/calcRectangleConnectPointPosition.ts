import { calcRectKeyPoints, isRect } from "@workspace/geometry";
import type { RectKeyPoints } from "@workspace/geometry";

import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";
import { isConnectableState } from "../../validation/isConnectableState";
import { isTransformativeState } from "../../validation/isTransformativeState";

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
	if (!isTransformativeState(diagram)) return []; // Type guard.

	// Calculate the key points of the rectangle.
	const keyPoints = calcRectKeyPoints({
		x: diagram.x,
		y: diagram.y,
		width: diagram.width,
		height: diagram.height,
		rotation: diagram.rotation,
		scaleX: diagram.scaleX,
		scaleY: diagram.scaleY,
	});

	// Create connection point move data.
	const newConnectPoints: ConnectPointState[] = [];
	for (const connectPointData of diagram.connectPoints) {
		const keyPoint = (keyPoints as RectKeyPoints)[
			connectPointData.name as keyof RectKeyPoints
		];

		newConnectPoints.push({
			id: connectPointData.id,
			type: "ConnectPoint",
			geometryType: "point",
			name: connectPointData.name,
			x: keyPoint.x,
			y: keyPoint.y,
			isDragging: false,
		});
	}

	return newConnectPoints;
};
