import { calcRoundedRectOutline } from "@jiscribe/canvas-sdk/doc";
import type { ObjectDocOutlineCalculator } from "@jiscribe/doc";
import type { Dimensions } from "@jiscribe/geometry";

import { SERVER_CORNER_RATIO } from "./ServerDoc";

/**
 * Server outline (centered): the rack's rounded box. The units and status
 * lights inside it are detail and take no part in the silhouette.
 */
export const serverOutline: ObjectDocOutlineCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcRoundedRectOutline(
		width,
		height,
		Math.min(width, height) * SERVER_CORNER_RATIO,
	);
