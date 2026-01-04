import type { BoxFeatures, TransformedFrame, Point } from "@workspace/geometry";

import { getLineDirection } from "./getLineDirection";
import { CONNECT_LINE_MARGIN } from "../../../constants/core/Constants";

/**
 * Gets the second connect point for a shape based on direction.
 *
 * @param ownerFrame - The frame that owns the connect point
 * @param ownerBoundingBoxGeometry - The bounding box features of the owner shape
 * @param cx - Connect point x coordinate
 * @param cy - Connect point y coordinate
 * @returns The second connect point
 */
export const getSecondConnectPoint = (
	ownerFrame: TransformedFrame,
	ownerBoundingBoxGeometry: BoxFeatures,
	cx: number,
	cy: number,
): Point => {
	const direction = getLineDirection(ownerFrame.cx, ownerFrame.cy, cx, cy);

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
