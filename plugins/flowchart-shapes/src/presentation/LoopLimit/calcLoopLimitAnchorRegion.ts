import type { ObjectAnchorRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { LOOP_LIMIT_CUT_RATIO } from "../../schema/loopLimit/LoopLimitDoc";

/**
 * Insets the top by the corner cut so the left/right anchors sit at the middle
 * of the straight side rather than up in the bevelled part. The cut follows the
 * shorter side (min(w, h) * LOOP_LIMIT_CUT_RATIO), so a constant ratio would
 * misplace them at non-square aspect ratios.
 */
export const calcLoopLimitAnchorRegion: ObjectAnchorRegionCalculator<
	Dimensions
> = ({ width, height }) => {
	const cut = Math.min(width, height) * LOOP_LIMIT_CUT_RATIO;
	return calcInsetRect({ cx: 0, cy: 0, width, height }, { top: cut / height });
};
