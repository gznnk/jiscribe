import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import {
	SMARTPHONE_SCREEN_HEIGHT_RATIO,
	SMARTPHONE_SCREEN_X_RATIO,
	SMARTPHONE_SCREEN_Y_RATIO,
} from "../../schema/smartphone/SmartphoneDoc";

/** Gap between the screen edge and the text, as a ratio of the box. */
const SMARTPHONE_TEXT_PADDING_RATIO = 0.04;

/** Places the text on the screen, clear of the case, the speaker slit and the home bar. */
export const calcSmartphoneTextRegion: ObjectTextRegionCalculator<
	Dimensions
> = ({ width, height }) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			top: SMARTPHONE_SCREEN_Y_RATIO + SMARTPHONE_TEXT_PADDING_RATIO,
			right: SMARTPHONE_SCREEN_X_RATIO + SMARTPHONE_TEXT_PADDING_RATIO,
			bottom:
				1 -
				SMARTPHONE_SCREEN_Y_RATIO -
				SMARTPHONE_SCREEN_HEIGHT_RATIO +
				SMARTPHONE_TEXT_PADDING_RATIO,
			left: SMARTPHONE_SCREEN_X_RATIO + SMARTPHONE_TEXT_PADDING_RATIO,
		},
	);
