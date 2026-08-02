import type { ObjectOutlineCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";

import { WINDOW_CORNER_RATIO } from "../shared/buildWindowFrame";
import { calcRoundedRectOutline } from "../shared/calcRoundedRectOutline";

/**
 * Terminal window outline (centered): the frame's rounded box, shared in shape
 * with the browser. The title bar and its prompt are detail.
 */
export const terminalWindowOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcRoundedRectOutline(
		width,
		height,
		Math.min(width, height) * WINDOW_CORNER_RATIO,
	);
