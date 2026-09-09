/**
 * Zoom configuration constants
 */
export const ZOOM = {
	/** Minimum zoom level (10%) */
	MIN: 0.1,
	/** Maximum zoom level (1000%) */
	MAX: 10,
	/** Zoom step factor when zooming in (continuous zoom for the mouse wheel) */
	IN_FACTOR: 1.1,
	/** Zoom step factor when zooming out (continuous zoom for the mouse wheel) */
	OUT_FACTOR: 0.9,
	/** Decimal places the zoom factor is rounded to before it enters the viewport */
	PRECISION: 4,
} as const;

/**
 * Fixed zoom stops that the Zoom In / Zoom Out commands (keyboard and toolbar)
 * snap to. Like Miro, always snaps to the same values (…/75/100/125/150/…) so
 * that zooming in then out always returns to the original stop (e.g. 100%).
 *
 * Kept in ascending order. The endpoints match {@link ZOOM.MIN} / {@link ZOOM.MAX}.
 */
export const ZOOM_STOPS = [
	0.1, 0.125, 0.16, 0.25, 0.33, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8,
	10,
] as const;

/** Comparison epsilon that tolerates floating-point matches against a stop. */
const ZOOM_STEP_EPSILON = 1e-4;

/**
 * Returns the next fixed stop above the current zoom value.
 * When between stops, snaps to the nearest stop above; at the top stop, clamps
 * to {@link ZOOM.MAX}.
 */
export function stepZoomIn(currentZoom: number): number {
	const nextStop = ZOOM_STOPS.find(
		(stop) => stop > currentZoom + ZOOM_STEP_EPSILON,
	);
	return nextStop ?? ZOOM.MAX;
}

/**
 * Returns the next fixed stop below the current zoom value.
 * When between stops, snaps to the nearest stop below; at the bottom stop,
 * clamps to {@link ZOOM.MIN}.
 */
export function stepZoomOut(currentZoom: number): number {
	for (let i = ZOOM_STOPS.length - 1; i >= 0; i--) {
		if (ZOOM_STOPS[i] < currentZoom - ZOOM_STEP_EPSILON) {
			return ZOOM_STOPS[i];
		}
	}
	return ZOOM.MIN;
}
