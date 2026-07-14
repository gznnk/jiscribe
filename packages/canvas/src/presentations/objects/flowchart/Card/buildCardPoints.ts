import { CARD_CUT_RATIO } from "../../../../schemas/objects/flowchart/card/CardDoc";

/**
 * Builds the card point list (top-left corner cut off) for a bounding box whose
 * top-left corner is at (x, y). The cut length follows the shorter side so the
 * corner stays a 45-degree bevel at any aspect ratio. Shared by the object
 * renderer (centered origin) and the draw-drag preview.
 */
export const buildCardPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => {
	const cut = Math.min(width, height) * CARD_CUT_RATIO;
	return [
		`${x + cut},${y}`,
		`${x + width},${y}`,
		`${x + width},${y + height}`,
		`${x},${y + height}`,
		`${x},${y + cut}`,
	].join(" ");
};
