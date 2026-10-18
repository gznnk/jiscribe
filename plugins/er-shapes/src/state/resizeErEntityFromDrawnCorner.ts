import { roundDocCoordinate } from "@jiscribe/canvas-sdk/doc";
import {
	calcFrameCenterFromTopLeft,
	calcFrameKeyPoint,
} from "@jiscribe/geometry";
import type { Dimensions } from "@jiscribe/geometry";

import type { ErEntityState } from "./ErEntityState";

/**
 * The state with `size` as its box: the corner the entity is drawn from (the
 * frame's "topLeft" key point) stays where it is and the center moves instead.
 *
 * The corner is read off `state`, so the state handed in has to still carry the
 * box the entity is drawn at — a new size belongs in `size`, never written onto
 * `state` first.
 *
 * @param state - The entity whose box is being replaced; its `cx` / `cy` / `width` / `height` locate the kept corner, and its transform decides which corner that is
 * @param size - The new box in local px
 * @returns A new state with the box and the recentred origin; every other field carried over
 */
export const resizeErEntityFromDrawnCorner = (
	state: ErEntityState,
	size: Dimensions,
): ErEntityState => {
	const drawnTopLeft = calcFrameKeyPoint(state, "topLeft");
	const center = calcFrameCenterFromTopLeft(
		{
			x: roundDocCoordinate(drawnTopLeft.x),
			y: roundDocCoordinate(drawnTopLeft.y),
		},
		size,
		state,
	);
	return {
		...state,
		cx: center.x,
		cy: center.y,
		width: size.width,
		height: size.height,
	};
};
