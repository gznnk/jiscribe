import {
	degreesToRadians,
	nanToZero,
	calcRotatedPoint,
	isFrame,
} from "@workspace/geometry";

import { convertDiagramToFrame } from "./convertDiagramToFrame";
import type { Diagram } from "../../types/state/core/Diagram";

/**
 * Calculates the bounding box of a diagram when the group rotation is removed.
 *
 * @param diagram - The diagram item
 * @param groupCenterX - Group center X coordinate
 * @param groupCenterY - Group center Y coordinate
 * @param groupRotation - Group rotation angle in degrees
 * @returns The diagram's bounding box
 */
export const calcDiagramBoundingBoxInUnrotatedGroup = (
	diagram: Diagram,
	groupCenterX: number,
	groupCenterY: number,
	groupRotation: number,
) => {
	const frame = convertDiagramToFrame(diagram) ?? {
		cx: 0,
		cy: 0,
		width: 0,
		height: 0,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	};

	const groupRadians = degreesToRadians(-groupRotation);

	const inversedCenter = calcRotatedPoint(
		frame.cx,
		frame.cy,
		groupCenterX,
		groupCenterY,
		groupRadians,
	);

	if (isFrame(frame)) {
		const halfWidth = nanToZero(frame.width / 2);
		const halfHeight = nanToZero(frame.height / 2);
		const diagramRadians = degreesToRadians(frame.rotation - groupRotation);

		const leftTop = calcRotatedPoint(
			inversedCenter.x - halfWidth,
			inversedCenter.y - halfHeight,
			inversedCenter.x,
			inversedCenter.y,
			diagramRadians,
		);

		const rightTop = calcRotatedPoint(
			inversedCenter.x + halfWidth,
			inversedCenter.y - halfHeight,
			inversedCenter.x,
			inversedCenter.y,
			diagramRadians,
		);

		const leftBottom = calcRotatedPoint(
			inversedCenter.x - halfWidth,
			inversedCenter.y + halfHeight,
			inversedCenter.x,
			inversedCenter.y,
			diagramRadians,
		);

		const rightBottom = calcRotatedPoint(
			inversedCenter.x + halfWidth,
			inversedCenter.y + halfHeight,
			inversedCenter.x,
			inversedCenter.y,
			diagramRadians,
		);

		return {
			top: Math.min(leftTop.y, rightBottom.y, leftBottom.y, rightTop.y),
			left: Math.min(leftTop.x, rightBottom.x, leftBottom.x, rightTop.x),
			bottom: Math.max(leftTop.y, rightBottom.y, leftBottom.y, rightTop.y),
			right: Math.max(leftTop.x, rightBottom.x, leftBottom.x, rightTop.x),
		};
	}

	return {
		top: inversedCenter.y,
		left: inversedCenter.x,
		bottom: inversedCenter.y,
		right: inversedCenter.x,
	};
};
