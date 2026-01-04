/**
 * Geometry definition for a frame (primitive).
 * Pure geometric definition without transformation.
 * Uses center coordinate system.
 */
export type Frame = {
	/** Center X coordinate */
	cx: number;
	/** Center Y coordinate */
	cy: number;
	/** Width of the frame */
	width: number;
	/** Height of the frame */
	height: number;
};
