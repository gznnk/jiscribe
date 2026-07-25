import type { Point } from "./Point";

/** The eight reference points of a shape: four corners and four edge midpoints. */
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

/** Key identifying a single point of {@link KeyPoints}. */
export type KeyPointId = keyof KeyPoints;
