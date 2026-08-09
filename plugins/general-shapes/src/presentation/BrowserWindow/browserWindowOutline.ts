import type { ObjectOutlineCalculator } from "@jiscribe/canvas";
import { calcRoundedRectOutline } from "@jiscribe/canvas-sdk";
import type { Dimensions } from "@jiscribe/geometry";

import { WINDOW_CORNER_RATIO } from "../shared/buildWindowFrame";

/**
 * Browser window outline (centered): the frame's rounded box, shared in shape
 * with the terminal. The title bar and its buttons are detail.
 */
export const browserWindowOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcRoundedRectOutline(
		width,
		height,
		Math.min(width, height) * WINDOW_CORNER_RATIO,
	);
