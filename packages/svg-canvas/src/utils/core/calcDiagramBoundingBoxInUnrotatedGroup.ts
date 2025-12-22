import type { Diagram } from "../../types/state/core/Diagram";
import { degreesToRadians } from "../math/common/degreesToRadians";
import { nanToZero } from "../math/common/nanToZero";
import { rotatePoint } from "../math/points/rotatePoint";
import { isFrame } from "../validation/isFrame";

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
	const groupRadians = degreesToRadians(-groupRotation);

	const inversedCenter = rotatePoint(
		diagram.x,
		diagram.y,
		groupCenterX,
		groupCenterY,
		groupRadians,
	);

	if (isFrame(diagram)) {
		const halfWidth = nanToZero(diagram.width / 2);
		const halfHeight = nanToZero(diagram.height / 2);
		const diagramRadians = degreesToRadians(diagram.rotation - groupRotation);

		const leftTop = rotatePoint(
			inversedCenter.x - halfWidth,
			inversedCenter.y - halfHeight,
			inversedCenter.x,
			inversedCenter.y,
			diagramRadians,
		);

		const rightTop = rotatePoint(
			inversedCenter.x + halfWidth,
			inversedCenter.y - halfHeight,
			inversedCenter.x,
			inversedCenter.y,
			diagramRadians,
		);

		const leftBottom = rotatePoint(
			inversedCenter.x - halfWidth,
			inversedCenter.y + halfHeight,
			inversedCenter.x,
			inversedCenter.y,
			diagramRadians,
		);

		const rightBottom = rotatePoint(
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
