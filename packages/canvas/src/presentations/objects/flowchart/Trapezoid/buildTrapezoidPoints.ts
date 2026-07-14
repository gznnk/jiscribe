import { TRAPEZOID_SLOPE_RATIO } from "../../../../schemas/objects/flowchart/trapezoid/TrapezoidDoc";

/**
 * Builds the trapezoid point list (wide top, narrow bottom) for a bounding box
 * whose top-left corner is at (x, y). Used for manual-operation steps. Shared by
 * the object renderer (centered origin) and the draw-drag preview.
 */
export const buildTrapezoidPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => {
	const inset = width * TRAPEZOID_SLOPE_RATIO;
	return [
		`${x},${y}`,
		`${x + width},${y}`,
		`${x + width - inset},${y + height}`,
		`${x + inset},${y + height}`,
	].join(" ");
};
