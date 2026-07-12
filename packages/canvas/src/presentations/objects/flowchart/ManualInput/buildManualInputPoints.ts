import { MANUAL_INPUT_SLOPE_RATIO } from "../../../../schemas/objects/flowchart/manualInput/ManualInputDoc";

/**
 * Builds the manual-input point list (top edge sloping up toward the right) for a
 * bounding box whose top-left corner is at (x, y). Shared by the object renderer
 * (centered origin) and the draw-drag preview.
 */
export const buildManualInputPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => {
	const slope = height * MANUAL_INPUT_SLOPE_RATIO;
	return [
		`${x},${y + slope}`,
		`${x + width},${y}`,
		`${x + width},${y + height}`,
		`${x},${y + height}`,
	].join(" ");
};
