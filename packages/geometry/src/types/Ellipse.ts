/**
 * Geometry definition for elliptical shapes.
 * Uses center coordinate system with radii.
 */
export type Ellipse = {
	/** Center X coordinate */
	cx: number;
	/** Center Y coordinate */
	cy: number;
	/** Radius along X axis */
	rx: number;
	/** Radius along Y axis */
	ry: number;
	/** Rotation in degrees */
	rotation: number;
	/** Scale factor for X axis */
	scaleX: number;
	/** Scale factor for Y axis */
	scaleY: number;
};
