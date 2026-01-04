import { calcEllipseKeyPoints } from "@workspace/geometry";
import type { EllipseKeyPoints } from "@workspace/geometry";

import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";
import { newId } from "../../../utils/shapes/common/newId";

/**
 * Create connection points for the ellipse.
 *
 * @param params - The parameters for creating the connection points.
 * @returns An array of connection point data.
 */
export const createEllipseConnectPoint = ({
	cx,
	cy,
	rx,
	ry,
	rotation,
	scaleX,
	scaleY,
}: {
	cx: number;
	cy: number;
	rx: number;
	ry: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
}): ConnectPointState[] => {
	const keyPoints = calcEllipseKeyPoints({
		cx,
		cy,
		rx,
		ry,
		rotation,
		scaleX,
		scaleY,
	});

	const connectPoints: ConnectPointState[] = [];
	for (const key of Object.keys(keyPoints)) {
		const point = keyPoints[key as keyof EllipseKeyPoints];
		connectPoints.push({
			id: newId(),
			type: "ConnectPoint",
			geometryType: "point",
			x: point.x,
			y: point.y,
			name: key,
		});
	}

	return connectPoints;
};
