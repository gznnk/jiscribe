import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas/doc";
import {
	AUTO_COLOR,
	BELOW_LABEL_STYLE_DEFAULTS,
} from "@workspace/canvas/unstable-doc";

/**
 * A row of cells, used for job queues and message queues.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect. The text is drawn as a label below the box, auto-sized to the text itself, so it stays readable at any box size.
 */
export const QueueFeatures = {
	type: "queue",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * Corner radius as a fraction of the shorter side. Shared by the silhouette
 * and the outline, which rounds the same corners the drawing does.
 */
export const QUEUE_CORNER_RATIO = 0.12;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const QueueDocBrand: unique symbol;

export type QueueDoc = CreateObjectType<
	typeof QueueFeatures,
	typeof QueueDocBrand
>;

export const QUEUE_DOC_DEFAULTS: Omit<QueueDoc, "id"> = {
	type: "queue",
	x: 0,
	y: 0,
	width: 160,
	height: 70,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	...BELOW_LABEL_STYLE_DEFAULTS,
} as const as QueueDoc;
