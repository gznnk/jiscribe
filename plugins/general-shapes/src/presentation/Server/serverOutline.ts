import type { ObjectOutlineCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";

import { SERVER_CORNER_RATIO } from "../../schema/server/ServerDoc";
import { calcRoundedRectOutline } from "../shared/calcRoundedRectOutline";

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
