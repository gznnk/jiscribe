/**
 * Zoom configuration constants
 */
export const ZOOM = {
	/** Minimum zoom level (10%) */
	MIN: 0.1,
	/** Maximum zoom level (1000%) */
	MAX: 10,
	/** Zoom step factor when zooming in */
	IN_FACTOR: 1.1,
	/** Zoom step factor when zooming out */
	OUT_FACTOR: 0.9,
} as const;
