import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { LOOP_LIMIT_CUT_RATIO } from "../../../../schemas/objects/flowchart/loopLimit/LoopLimitDoc";

/**
 * Insets the top by the corner cut so the region sits fully below the bevels
 * (the shape is full-width beneath them). The cut follows the shorter side
 * (min(w, h) * LOOP_LIMIT_CUT_RATIO), so a constant ratio would let the top
 * edge poke into the removed corners at non-square aspect ratios.
 */
export const calcLoopLimitTextRegion = ({
	width,
	height,
}: Dimensions): Rect => {
	const cut = Math.min(width, height) * LOOP_LIMIT_CUT_RATIO;
	return calcInsetRect({ cx: 0, cy: 0, width, height }, { top: cut / height });
};
