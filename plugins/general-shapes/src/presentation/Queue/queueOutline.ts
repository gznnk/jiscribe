import type { ObjectOutlineCalculator } from "@workspace/canvas";
import { calcRoundedRectOutline } from "@workspace/canvas-sdk";
import type { Dimensions } from "@workspace/geometry";

import { QUEUE_CORNER_RATIO } from "../../schema/queue/QueueDoc";

/**
 * Queue outline (centered): the row's rounded box. The cell dividers are detail
 * and take no part in the silhouette.
 */
export const queueOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcRoundedRectOutline(
		width,
		height,
		Math.min(width, height) * QUEUE_CORNER_RATIO,
	);
