import { PRECISION } from "@jiscribe/canvas-sdk";
import {
	calcFrameCenterFromTopLeft,
	calcFrameTopLeft,
	roundToDecimal,
} from "@jiscribe/geometry";

import type { TableState } from "./TableState";
import { calcTableFrameSize } from "../layout/calcTableFrameSize";

/**
 * Re-derives a table's box from its own grid: the width the column widths summed,
 * the height the resolved row heights summed (calcTableLayout). Registered as the
 * type's `contentResizer`, so it runs on load, on undo, on external sync and
 * around every edit — a cell gaining a line widens no column but makes its row,
 * and so the table, taller.
 *
 * The box grows right and down: the corner the document names stays where it is
 * drawn (calcFrameTopLeft), and the center moves instead.
 *
 * Returning `state` itself when the measurement matches the box it already has is
 * part of the contract (ObjectContentResizer): callers run this on every frame of
 * every gesture and skip the rest of the pass on reference equality.
 *
 * @param state - The table to measure; its `columns` / `rows` / `text` are read, its box rewritten
 * @returns The state with the derived box, or the same object when nothing moved
 */
export const resizeTableStateToContent = (state: TableState): TableState => {
	const size = calcTableFrameSize(state);
	if (size.width === state.width && size.height === state.height) {
		return state;
	}
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
