import type { Point } from "./Point";

/**
 * Defines the coordinates for feature points of a frame.
 */
export type FrameFeaturePoints = {
	topLeft: Point;
	topCenter: Point;
	topRight: Point;
	rightCenter: Point;
	bottomRight: Point;
	bottomCenter: Point;
	bottomLeft: Point;
	leftCenter: Point;
};
