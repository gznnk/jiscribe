/**
 * Geometry definition for rectangular shapes (primitive).
 * Pure geometric definition without transformation.
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
};
