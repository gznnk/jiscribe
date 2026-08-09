import type { ObjectOutlineCalculator } from "@jiscribe/canvas";
import { calcRoundedRectOutline } from "@jiscribe/canvas-sdk";
import type { Dimensions } from "@jiscribe/geometry";

import { SERVER_CORNER_RATIO } from "../../schema/server/ServerDoc";

/**
 * Server outline (centered): the rack's rounded box. The units and status
 * lights inside it are detail and take no part in the silhouette.
 */
export const serverOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcRoundedRectOutline(
		width,
		height,
		Math.min(width, height) * SERVER_CORNER_RATIO,
	);
