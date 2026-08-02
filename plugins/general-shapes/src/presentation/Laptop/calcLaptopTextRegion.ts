import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import {
	LAPTOP_SCREEN_HEIGHT_RATIO,
	LAPTOP_SCREEN_X_RATIO,
} from "../../schema/laptop/LaptopDoc";

/** Gap between the screen edge and the text, as a ratio of the box. */
const LAPTOP_TEXT_PADDING_RATIO = 0.05;

/** Places the text on the screen, so it stays clear of the base below it. */
export const calcLaptopTextRegion: ObjectTextRegionCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			top: LAPTOP_TEXT_PADDING_RATIO,
			right: LAPTOP_SCREEN_X_RATIO + LAPTOP_TEXT_PADDING_RATIO,
			bottom: 1 - LAPTOP_SCREEN_HEIGHT_RATIO + LAPTOP_TEXT_PADDING_RATIO,
			left: LAPTOP_SCREEN_X_RATIO + LAPTOP_TEXT_PADDING_RATIO,
		},
	);
