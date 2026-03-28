/**
 * Precision configuration for rounding numeric values
 */
export const PRECISION = {
	/** Coordinate values (x, y, cx, cy, minX, minY) */
	COORDINATE: 4,
	/** Size values (width, height) */
	SIZE: 4,
	/** Zoom level */
	ZOOM: 4,
	/** Rotation angle (degrees) */
	ROTATION: 3,
} as const;
