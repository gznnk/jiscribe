import {
	DISPLAY_CAP_RATIO,
	DISPLAY_LEFT_RATIO,
} from "../../../../schemas/objects/primitives/display/DisplayDoc";

/**
 * Builds the display path (pointed left edge, rounded right cap) for a bounding
 * box whose top-left corner is at (x, y). Shared by the object renderer (centered
 * origin) and the draw-drag preview.
 */
export const buildDisplayPath = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => {
	const leftInset = width * DISPLAY_LEFT_RATIO;
	const capRx = width * DISPLAY_CAP_RATIO;
	const midY = y + height / 2;
	return (
		`M ${x} ${midY} L ${x + leftInset} ${y} ` +
		`H ${x + width - capRx} ` +
		`A ${capRx} ${height / 2} 0 0 1 ${x + width - capRx} ${y + height} ` +
		`H ${x + leftInset} Z`
	);
};
