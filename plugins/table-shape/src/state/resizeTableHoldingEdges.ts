import type { ResizedAxes, ResizeHeldEdge } from "@jiscribe/canvas";
import { PRECISION } from "@jiscribe/canvas-sdk";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
	roundToDecimal,
} from "@jiscribe/geometry";
import type { Dimensions } from "@jiscribe/geometry";

import type { TableState } from "./TableState";

/** Where an axis's held edge lies from the middle of a box `size` long, before flips. */
const calcHeldOffset = (edge: ResizeHeldEdge, size: number): number => {
	if (edge === "center") {
		return 0;
	}
	return edge === "start" ? -size / 2 : size / 2;
};

/**
 * The state with `size` as its box, larger or smaller, holding `heldEdges` where
 * they are and moving the center instead. An axis `heldEdges` leaves out holds
 * its start, so with none the corner the table is drawn from (the frame's
 * "topLeft" key point) stays put.
 *
 * The edges are read off `state`, so the state handed in has to still carry the
 * box the table is drawn at — a new size belongs in `size`, never written onto
 * `state` first, or the edges come out somewhere the table never was.
 *
 * @param state - The table whose box is being replaced; its `cx` / `cy` / `width` / `height` are what the held edges are read from, and its transform decides where they lie
 * @param size - The box to put on it, in local px
 * @param heldEdges - Per axis, the edge to keep in the table's own frame, flips included (`ObjectContentResizeContext.resizedAxes` during a resize drag)
 * @returns A new state with the box and the recentred origin; every other field is carried over
 */
export const resizeTableHoldingEdges = (
	state: TableState,
	size: Dimensions,
	heldEdges: ResizedAxes,
): TableState => {
	const widthEdge = heldEdges.width ?? "start";
	const heightEdge = heldEdges.height ?? "start";
	const radians = degreesToRadians(state.rotation);
	const held = calcAffineTransformedPoint(
		calcHeldOffset(widthEdge, state.width),
		calcHeldOffset(heightEdge, state.height),
		state.scaleX,
		state.scaleY,
		radians,
		state.cx,
		state.cy,
	);
	const center = calcAffineTransformedPoint(
		-calcHeldOffset(widthEdge, size.width),
		-calcHeldOffset(heightEdge, size.height),
		state.scaleX,
		state.scaleY,
		radians,
		roundToDecimal(held.x, PRECISION.COORDINATE),
		roundToDecimal(held.y, PRECISION.COORDINATE),
	);
	return {
		...state,
		cx: center.x,
		cy: center.y,
		width: size.width,
		height: size.height,
	};
};
