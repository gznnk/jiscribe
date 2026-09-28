import type { Point } from "@jiscribe/geometry";

import type { AxisLockFeedback } from "../../../CanvasTypes";

/**
 * Distance threshold (screen px) for snapping to the start position (origin)
 * while the axis is locked.
 * If the movement along the free axis is at or below this value, it snaps to the
 * start position and shows guides for both axes.
 */
export const ORIGIN_SNAP_PX = 6;

/** Result of {@link applyAxisLock}. */
export type AxisLockResult = {
	/** Cursor position with the locked axis (or both, on origin snap) replaced by the origin's coordinate */
	point: Point;
	/** The axis held at the origin's coordinate; null when Shift is not held */
	lockedAxis: "x" | "y" | null;
	/** True when the free-axis displacement fell within {@link ORIGIN_SNAP_PX}, snapping the point back to the origin */
	snapToOrigin: boolean;
	/** Full-viewport guide lines for the lock; null when not locked */
	feedback: AxisLockFeedback | null;
};

/**
 * Constrains a Shift-drag to horizontal or vertical movement from its origin.
 * The axis with the smaller cumulative displacement is locked, so the lock
 * follows when the dominant axis swaps mid-drag; ties lock Y (horizontal move).
 *
 * @param origin - Drag start position in SVG coordinates; the locked axis keeps its coordinate
 * @param cursor - Current pointer position in SVG coordinates
 * @param options.shift - Whether Shift is held; false returns the cursor untouched with no feedback
 * @param options.zoom - Viewport zoom, used to convert {@link ORIGIN_SNAP_PX} to SVG units
 * @param options.originSnap - Whether a tiny free-axis displacement snaps back to the origin (crosshair feedback).
 *   Pass false where landing on the origin is meaningless, such as drawing a line (it would have zero length)
 */
export const applyAxisLock = (
	origin: Point,
	cursor: Point,
	options: { shift: boolean; zoom: number; originSnap: boolean },
): AxisLockResult => {
	if (!options.shift) {
		return {
			point: { x: cursor.x, y: cursor.y },
			lockedAxis: null,
			snapToOrigin: false,
			feedback: null,
		};
	}

	const dx = cursor.x - origin.x;
	const dy = cursor.y - origin.y;
	const lockedAxis: "x" | "y" = Math.abs(dx) >= Math.abs(dy) ? "y" : "x";

	const freeAxisDelta = lockedAxis === "x" ? dy : dx;
	const snapToOrigin =
		options.originSnap &&
		Math.abs(freeAxisDelta) <= ORIGIN_SNAP_PX / options.zoom;

	if (snapToOrigin) {
		return {
			point: { x: origin.x, y: origin.y },
			lockedAxis,
			snapToOrigin,
			feedback: { x: origin.x, y: origin.y },
		};
	}

	return lockedAxis === "y"
		? {
				point: { x: cursor.x, y: origin.y },
				lockedAxis,
				snapToOrigin,
				feedback: { y: origin.y },
			}
		: {
				point: { x: origin.x, y: cursor.y },
				lockedAxis,
				snapToOrigin,
				feedback: { x: origin.x },
			};
};
