import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { CARD_CUT_RATIO } from "../../../../schemas/objects/flowchart/card/CardDoc";
import type { TextRegionCalculator } from "../../registry/TextRegionRegistry";

/**
 * Insets the top by the corner cut so the region sits fully below the bevel
 * (the card is full-width beneath it). The cut follows the shorter side
 * (min(w, h) * CARD_CUT_RATIO), so a constant ratio would let the top edge
 * poke into the removed corner at non-square aspect ratios.
 */
export const calcCardTextRegion: TextRegionCalculator<Dimensions> = ({
	width,
	height,
}) => {
	const cut = Math.min(width, height) * CARD_CUT_RATIO;
	return calcInsetRect({ cx: 0, cy: 0, width, height }, { top: cut / height });
};
