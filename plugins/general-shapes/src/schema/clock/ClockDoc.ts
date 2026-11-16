import { AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";
import {
	DEFAULT_FILL,
	DEFAULT_STROKE_WIDTH,
	LABEL_TEXT_STYLE_DEFAULTS,
} from "@jiscribe/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/**
 * A clock, used for schedulers, cron jobs, periodic runs, timers and timeouts.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect. The text is drawn as a label below the box, auto-sized to the text itself, so it stays readable at any box size.
 */
export const ClockFeatures = {
	type: "clock",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "label",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ClockDocBrand: unique symbol;

export type ClockDoc = CreateObjectType<
	typeof ClockFeatures,
	typeof ClockDocBrand
>;

export const CLOCK_DOC_DEFAULTS: Omit<ClockDoc, "id"> = {
	type: "clock",
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	fill: DEFAULT_FILL,
	stroke: AUTO_COLOR,
	strokeWidth: DEFAULT_STROKE_WIDTH,
	text: "",
	...LABEL_TEXT_STYLE_DEFAULTS,
} as const as ClockDoc;
