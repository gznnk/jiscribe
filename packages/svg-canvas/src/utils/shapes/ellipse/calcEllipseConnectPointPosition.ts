import { calcEllipseKeyPoints, isEllipse } from "@workspace/geometry";
import type { EllipseKeyPoints } from "@workspace/geometry";

import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";
import { isConnectableState } from "../../validation/isConnectableState";
import { isTransformativeState } from "../../validation/isTransformativeState";

/**
 * Calculate the position of the connection points of the ellipse.
 *
 * @param diagram - The diagram data of the ellipse.
 * @returns An array of connection point move data.
 */
export const calcEllipseConnectPointPosition = (
	diagram: Diagram,
): ConnectPointState[] => {
	if (!isConnectableState(diagram) || !isEllipse(diagram) || !isTransformativeState(diagram)) return []; // Type guard.

	// Calculate the key points of the ellipse.
	const keyPoints = calcEllipseKeyPoints({
		cx: diagram.cx,
		cy: diagram.cy,
		rx: diagram.rx,
		ry: diagram.ry,
		rotation: diagram.rotation,
		scaleX: diagram.scaleX,
		scaleY: diagram.scaleY,
	});

	// Create connection point move data.
	const newConnectPoints: ConnectPointState[] = [];
	for (const connectPointData of diagram.connectPoints) {
		const keyPoint = (keyPoints as EllipseKeyPoints)[
			connectPointData.name as keyof EllipseKeyPoints
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
