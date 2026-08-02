import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { SHIELD_SHOULDER_RATIO } from "../../schema/shield/ShieldDoc";

/** Gap between the silhouette and the text, as a ratio of the box. */
const SHIELD_TEXT_PADDING_RATIO = 0.07;

/**
 * Keeps the text in the shield's straight-sided upper part, above the shoulders
 * where the flanks start closing in on the tip. The lower part is left empty on
 * purpose: a centered line there would sit in the taper and clip on both sides.
 */
export const calcShieldTextRegion: ObjectTextRegionCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			top: SHIELD_TEXT_PADDING_RATIO,
			right: SHIELD_TEXT_PADDING_RATIO,
			bottom: 1 - SHIELD_SHOULDER_RATIO,
			left: SHIELD_TEXT_PADDING_RATIO,
		},
	);
