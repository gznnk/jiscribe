/**
 * Defines transformation properties for shapes.
 * Used to apply rotation and scaling to geometric primitives.
 */
export type Transform = {
	/** Rotation in degrees */
	rotation: number;
	/** Scale factor for X axis */
	scaleX: number;
	/** Scale factor for Y axis */
	scaleY: number;
};
