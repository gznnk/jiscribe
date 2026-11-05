import { calcRoundedRectOutline } from "@jiscribe/canvas-sdk/doc";
import type { ObjectDocOutlineCalculator } from "@jiscribe/doc";
import type { Dimensions } from "@jiscribe/geometry";

import { SMARTPHONE_CORNER_RATIO } from "./SmartphoneDoc";

/**
 * Smartphone outline (centered): the case's rounded box. The corner radius is
 * large enough here that the bounding box would cut a visible notch off each
 * corner.
 */
export const smartphoneOutline: ObjectDocOutlineCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcRoundedRectOutline(
		width,
		height,
		Math.min(width, height) * SMARTPHONE_CORNER_RATIO,
	);
