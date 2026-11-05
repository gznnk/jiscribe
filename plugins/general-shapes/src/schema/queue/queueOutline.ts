import { calcRoundedRectOutline } from "@jiscribe/canvas-sdk/doc";
import type { ObjectDocOutlineCalculator } from "@jiscribe/doc";
import type { Dimensions } from "@jiscribe/geometry";

import { QUEUE_CORNER_RATIO } from "./QueueDoc";

/**
 * Queue outline (centered): the row's rounded box. The cell dividers are detail
 * and take no part in the silhouette.
 */
export const queueOutline: ObjectDocOutlineCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcRoundedRectOutline(
		width,
		height,
		Math.min(width, height) * QUEUE_CORNER_RATIO,
	);
