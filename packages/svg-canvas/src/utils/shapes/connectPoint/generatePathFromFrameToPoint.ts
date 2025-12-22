import { addMarginToBoxGeometry } from "./addMarginToBoxGeometry";
import { getLineDirection } from "./getLineDirection";
import type { BoxGeometry } from "../../../types/core/BoxGeometry";
import type { Direction } from "../../../types/core/Direction";
import type { Point } from "../../../types/core/Point";
import { closer } from "../../math/common/closer";
import { segmentsIntersect } from "../../math/geometry/segmentsIntersect";

/**
 * Generates connection path points from a frame to an arbitrary point.
 * This function creates a path that avoids overlapping with the source frame
 * by creating intermediate points that route around the frame's bounding box.
 * Typically used during drag operations or when connecting to temporary points.
 *
 * @param startX - Start point x coordinate on the frame
 * @param startY - Start point y coordinate on the frame
 * @param startDirection - Direction from start frame (up/down/left/right)
 * @param startOwnerBoundingBoxGeometry - Bounding box geometry of start frame
 * @param endX - Target point x coordinate (can be anywhere)
 * @param endY - Target point y coordinate (can be anywhere)
 * @returns Array of points representing the connection path
 */
export const generatePathFromFrameToPoint = (
	startX: number,
	startY: number,
	startDirection: Direction,
	startOwnerBoundingBoxGeometry: BoxGeometry,
	endX: number,
	endY: number,
) => {
	// Array to store the calculated path points
	const pathPoints: Point[] = [];

	// Determine if the start direction is vertical (up/down) or horizontal (left/right)
	const isVerticalDirection =
		startDirection === "up" || startDirection === "down";

	// Add margin to the bounding box to ensure the path doesn't get too close to the shape
	const expandedBoundingBox = addMarginToBoxGeometry(
		startOwnerBoundingBoxGeometry,
	);

	// p1: Starting point of the connection
	const startPoint = { x: startX, y: startY };
	pathPoints.push(startPoint);

	// p2: First intermediate point - moves away from the start shape in the specified direction
	const firstIntermediatePoint = {
		x: isVerticalDirection ? startPoint.x : endX,
		y: isVerticalDirection ? endY : startPoint.y,
	};

	// Adjust p2 position based on start direction to clear the shape boundary
	if (isVerticalDirection) {
		if (startDirection === "up") {
			firstIntermediatePoint.y = expandedBoundingBox.top;
		} else {
			firstIntermediatePoint.y = expandedBoundingBox.bottom;
		}
	} else {
		if (startDirection === "right") {
			firstIntermediatePoint.x = expandedBoundingBox.right;
		} else {
			firstIntermediatePoint.x = expandedBoundingBox.left;
		}
	}
	pathPoints.push(firstIntermediatePoint);

	// p3: Second intermediate point - positioned to approach the end point
	const secondIntermediatePoint = {
		x: isVerticalDirection ? firstIntermediatePoint.x : endX,
		y: isVerticalDirection ? endY : firstIntermediatePoint.y,
	};

	// p4: Final end point
	const endPoint = { x: endX, y: endY };

	// Check if the direction of the line between p2-p3 is in reverse to the start direction
	// This happens when the end point is behind the start shape relative to the start direction
	const isReverseDirection =
		getLineDirection(
			firstIntermediatePoint.x,
			firstIntermediatePoint.y,
			secondIntermediatePoint.x,
			secondIntermediatePoint.y,
		) !== startDirection;

	if (isReverseDirection) {
		// If it's in reverse direction, adjust p3 to create a proper path
		if (isVerticalDirection) {
			secondIntermediatePoint.x = endPoint.x;
			secondIntermediatePoint.y = firstIntermediatePoint.y;
		} else {
			secondIntermediatePoint.x = firstIntermediatePoint.x;
			secondIntermediatePoint.y = endPoint.y;
		}
	}
	pathPoints.push(secondIntermediatePoint);
	pathPoints.push(endPoint);

	// Check if the line between p3-p4 intersects with shape edges
	// We need to check both the closer edge and the farther edge relative to the start direction
	let intersectsCloserEdge = false;
	let intersectsFartherEdge = false;

	if (startDirection === "up") {
		// For upward direction: closer edge is top, farther edge is bottom
		intersectsCloserEdge = segmentsIntersect(
			expandedBoundingBox.topLeft,
			expandedBoundingBox.topRight,
			secondIntermediatePoint,
			endPoint,
		);
		intersectsFartherEdge = segmentsIntersect(
			expandedBoundingBox.bottomLeft,
			expandedBoundingBox.bottomRight,
			secondIntermediatePoint,
			endPoint,
		);
	}
	if (startDirection === "down") {
		// For downward direction: closer edge is bottom, farther edge is top
		intersectsCloserEdge = segmentsIntersect(
			expandedBoundingBox.bottomLeft,
			expandedBoundingBox.bottomRight,
			secondIntermediatePoint,
			endPoint,
		);
		intersectsFartherEdge = segmentsIntersect(
			expandedBoundingBox.topLeft,
			expandedBoundingBox.topRight,
			secondIntermediatePoint,
			endPoint,
		);
	}
	if (startDirection === "left") {
		// For leftward direction: closer edge is left, farther edge is right
		intersectsCloserEdge = segmentsIntersect(
			expandedBoundingBox.topLeft,
			expandedBoundingBox.bottomLeft,
			secondIntermediatePoint,
			endPoint,
		);
		intersectsFartherEdge = segmentsIntersect(
			expandedBoundingBox.topRight,
			expandedBoundingBox.bottomRight,
			secondIntermediatePoint,
			endPoint,
		);
	}
	if (startDirection === "right") {
		// For rightward direction: closer edge is right, farther edge is left
		intersectsCloserEdge = segmentsIntersect(
			expandedBoundingBox.topRight,
			expandedBoundingBox.bottomRight,
			secondIntermediatePoint,
			endPoint,
		);
		intersectsFartherEdge = segmentsIntersect(
			expandedBoundingBox.topLeft,
			expandedBoundingBox.bottomLeft,
			secondIntermediatePoint,
			endPoint,
		);
	}

	if (intersectsCloserEdge) {
		// If intersecting with the closer edge, move p3 to the edge of the bounding box
		// to ensure the path goes around the shape properly
		if (isVerticalDirection) {
			secondIntermediatePoint.x = closer(
				endX,
				expandedBoundingBox.left,
				expandedBoundingBox.right,
			);
		} else {
			secondIntermediatePoint.y = closer(
				endY,
				expandedBoundingBox.top,
				expandedBoundingBox.bottom,
			);
		}
		// Adjust p4 position so it doesn't enter inside the shape
		if (isVerticalDirection) {
			endPoint.x = secondIntermediatePoint.x;
			endPoint.y = endY;
		} else {
			endPoint.x = endX;
			endPoint.y = secondIntermediatePoint.y;
		}
	}

	if (intersectsFartherEdge) {
		// If the farther edge is also intersecting, add an additional point (p5)
		// to completely avoid intersection with the shape
		const additionalPoint = { x: endX, y: endY };
		pathPoints.push(additionalPoint);
	}

	return pathPoints;
};
