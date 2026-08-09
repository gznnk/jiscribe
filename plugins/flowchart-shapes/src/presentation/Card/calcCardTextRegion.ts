import type { ObjectTextRegionCalculator } from "@jiscribe/canvas";
import type { Dimensions } from "@jiscribe/geometry";
import { calcInsetRect } from "@jiscribe/geometry";

import { CARD_CUT_RATIO } from "../../schema/card/CardDoc";

/**
 * Insets the top by the corner cut so the region sits fully below the bevel
 * (the card is full-width beneath it). The cut follows the shorter side
 * (min(w, h) * CARD_CUT_RATIO), so a constant ratio would let the top edge
 * poke into the removed corner at non-square aspect ratios.
 */
export const calcCardTextRegion: ObjectTextRegionCalculator<Dimensions> = ({
	width,
	height,
}) => {
	const cut = Math.min(width, height) * CARD_CUT_RATIO;
	return calcInsetRect({ cx: 0, cy: 0, width, height }, { top: cut / height });
};
