import { calcRectKeyPoints } from "@workspace/geometry";
import type { RectKeyPoints } from "@workspace/geometry";

import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";
import { newId } from "../../../utils/shapes/common/newId";

/**
 * Create connection points for a rectangle.
 *
 * @param shape - Shape parameters for the rectangle.
 * @returns An array of connection point data.
 */
export const createRectangleConnectPoint = ({
	x,
	y,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
}: {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
}): ConnectPointState[] => {
	const keyPoints = calcRectKeyPoints({
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	});

	const connectPoints: ConnectPointState[] = [];
	for (const key of Object.keys(keyPoints)) {
		const point = keyPoints[key as keyof RectKeyPoints];
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
