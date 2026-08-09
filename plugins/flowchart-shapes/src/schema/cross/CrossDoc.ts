import type { CreateObjectType, ObjectFeatures } from "@jiscribe/canvas/doc";
import {
	AUTO_COLOR,
	BELOW_LABEL_STYLE_DEFAULTS,
} from "@jiscribe/canvas-sdk/doc";

/**
 * A cross (plus) marker, used to mark junctions and for emphasis. The arms fill
 * the whole box, so its text is drawn as a label below it, auto-sized to the
 * text itself (calcBelowLabelTextRegion) — the marker stays a marker however
 * long the note on it gets.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect.
 */
export const CrossFeatures = {
	type: "cross",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CrossDocBrand: unique symbol;

export type CrossDoc = CreateObjectType<
	typeof CrossFeatures,
	typeof CrossDocBrand
>;

export const CROSS_DOC_DEFAULTS: Omit<CrossDoc, "id"> = {
	type: "cross",
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	...BELOW_LABEL_STYLE_DEFAULTS,
} as const as CrossDoc;
