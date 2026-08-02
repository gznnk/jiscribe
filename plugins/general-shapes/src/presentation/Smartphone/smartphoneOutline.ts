import type { ObjectOutlineCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";

import { SMARTPHONE_CORNER_RATIO } from "../../schema/smartphone/SmartphoneDoc";
import { calcRoundedRectOutline } from "../shared/calcRoundedRectOutline";

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
