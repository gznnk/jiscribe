import type { ObjectOutlineCalculator } from "@jiscribe/canvas";
import { calcRoundedRectOutline } from "@jiscribe/canvas-sdk";
import type { Dimensions } from "@jiscribe/geometry";

import { SMARTPHONE_CORNER_RATIO } from "../../schema/smartphone/SmartphoneDoc";

/**
 * Smartphone outline (centered): the case's rounded box. The corner radius is
 * large enough here that the bounding box would cut a visible notch off each
 * corner.
 */
export const smartphoneOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcRoundedRectOutline(
		width,
		height,
		Math.min(width, height) * SMARTPHONE_CORNER_RATIO,
	);
