import type { Point } from "./Point";

/**
 * Defines the coordinates for key reference points of a shape.
 * Includes corner points and mid-points for each side to support manipulation and connection.
 */
export type KeyPoints = {
	topLeft: Point;
	topCenter: Point;
	topRight: Point;
	rightCenter: Point;
	bottomRight: Point;
	bottomCenter: Point;
	bottomLeft: Point;
	leftCenter: Point;
};

/** KeyPoints のいずれか1点を指すキー。 */
export type KeyPointId = keyof KeyPoints;
