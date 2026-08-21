/**
 * Decimal places a value persisted in a Doc is rounded to.
 * This is the contract `roundDocNumbers` applies at the State → Doc boundary.
 */
export const PRECISION = {
	/** Coordinate values (x, y, cx, cy, minX, minY) */
	COORDINATE: 4,
	/** Size values (width, height) */
	SIZE: 4,
	/** Rotation angle (degrees) */
	ROTATION: 3,
} as const;
