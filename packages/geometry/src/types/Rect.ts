/**
 * Geometry definition for rectangular shapes.
 * Uses top-left coordinate system.
 */
export type Rect = {
	/** Top-left X coordinate */
	x: number;
	/** Top-left Y coordinate */
	y: number;
	/** Width of the rectangle */
	width: number;
	/** Height of the rectangle */
	height: number;
	/** Rotation in degrees */
	rotation: number;
	/** Scale factor for X axis */
	scaleX: number;
	/** Scale factor for Y axis */
	scaleY: number;
};
