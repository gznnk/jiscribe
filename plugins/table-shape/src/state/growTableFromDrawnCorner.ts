import { PRECISION } from "@jiscribe/canvas-sdk";
import {
	calcFrameCenterFromTopLeft,
	calcFrameTopLeft,
	roundToDecimal,
} from "@jiscribe/geometry";
import type { Dimensions } from "@jiscribe/geometry";

import type { TableState } from "./TableState";

/**
 * The state with `size` as its box, grown right and down: the corner the table is
 * drawn from stays where it is (calcFrameTopLeft) and the center moves instead.
 *
 * That corner is read off `state`, so the state handed in has to still carry the
 * box the table is drawn at — a new size belongs in `size`, never written onto
 * `state` first, or the corner comes out somewhere the table never was.
 *
 * @param state - The table whose box is being replaced; its `cx` / `cy` / `width` / `height` are what the kept corner is read from, and its transform decides which corner that is
 * @param size - The box to put on it, in local px; for a table following its grid, the column widths summed by the resolved row heights summed
 * @returns A new state with the box and the recentred origin; every other field is carried over
 */
export const growTableFromDrawnCorner = (
	state: TableState,
	size: Dimensions,
): TableState => {
	const drawnTopLeft = calcFrameTopLeft(state);
	const anchor = {
		x: roundToDecimal(drawnTopLeft.x, PRECISION.COORDINATE),
		y: roundToDecimal(drawnTopLeft.y, PRECISION.COORDINATE),
	};
	const center = calcFrameCenterFromTopLeft(anchor, size, state);
	return {
		...state,
		cx: center.x,
		cy: center.y,
		width: size.width,
		height: size.height,
	};
};
