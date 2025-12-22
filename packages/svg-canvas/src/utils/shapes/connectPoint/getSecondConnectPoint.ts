import { getLineDirection } from "./getLineDirection";
import { CONNECT_LINE_MARGIN } from "../../../constants/core/Constants";
import type { BoxGeometry } from "../../../types/core/BoxGeometry";
import type { Frame } from "../../../types/core/Frame";
import type { Point } from "../../../types/core/Point";

/**
 * Gets the second connect point for a shape based on direction.
 *
 * @param ownerFrame - The frame that owns the connect point
 * @param ownerBoundingBoxGeometry - The bounding box geometry of the owner shape
 * @param cx - Connect point x coordinate
 * @param cy - Connect point y coordinate
 * @returns The second connect point
 */
export const getSecondConnectPoint = (
	ownerFrame: Frame,
	ownerBoundingBoxGeometry: BoxGeometry,
	cx: number,
	cy: number,
): Point => {
	const direction = getLineDirection(ownerFrame.x, ownerFrame.y, cx, cy);

	if (direction === "up") {
		return { x: cx, y: ownerBoundingBoxGeometry.top - CONNECT_LINE_MARGIN };
	}
	if (direction === "down") {
		return { x: cx, y: ownerBoundingBoxGeometry.bottom + CONNECT_LINE_MARGIN };
	}
	if (direction === "left") {
		return { x: ownerBoundingBoxGeometry.left - CONNECT_LINE_MARGIN, y: cy };
	}
	if (direction === "right") {
		return { x: ownerBoundingBoxGeometry.right + CONNECT_LINE_MARGIN, y: cy };
	}
	return { x: 0, y: 0 };
};
