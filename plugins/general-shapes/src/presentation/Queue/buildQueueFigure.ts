import { QUEUE_CORNER_RATIO } from "../../schema/queue/QueueDoc";
import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import {
	buildRoundedRectPath,
	buildVerticalLinePath,
} from "../shared/pictogramPaths";

/** Cells the row is divided into; the dividers between them are what reads as a queue. */
const QUEUE_CELL_COUNT = 4;

/**
 * Lays out a queue over the bounding box whose top-left corner is at (x, y): one
 * rounded silhouette divided into equal cells. It carries no direction mark —
 * which end is the head is whatever the connectors say, so the shape stays usable
 * either way round. Shared by the object renderer (centered origin) and the
 * draw-drag preview that reuses it.
 */
export const buildQueueFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => ({
	body: [
		buildRoundedRectPath(
			x,
			y,
			width,
			height,
			Math.min(width, height) * QUEUE_CORNER_RATIO,
		),
	],
	detail: Array.from({ length: QUEUE_CELL_COUNT - 1 }, (_, index) =>
		buildVerticalLinePath(
			x + (width * (index + 1)) / QUEUE_CELL_COUNT,
			y,
			y + height,
		),
	),
});
