import type { Point } from "./Point";

/**
 * Defines the coordinates for key points of an ellipse.
 * Includes corner points and mid-points for each side to support manipulation and connection.
 */
export type EllipseVertices = {
	topLeftPoint: Point;
	bottomLeftPoint: Point;
	topRightPoint: Point;
	bottomRightPoint: Point;
	topCenterPoint: Point;
	leftCenterPoint: Point;
	rightCenterPoint: Point;
	bottomCenterPoint: Point;
};
