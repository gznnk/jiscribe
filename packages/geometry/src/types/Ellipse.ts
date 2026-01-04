/**
 * Geometry definition for elliptical shapes (primitive).
 * Pure geometric definition without transformation.
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
};
