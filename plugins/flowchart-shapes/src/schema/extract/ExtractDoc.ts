import type { CreateObjectType, ObjectFeatures } from "@jiscribe/canvas/doc";
import {
	AUTO_COLOR,
	BELOW_LABEL_STYLE_DEFAULTS,
} from "@jiscribe/canvas-sdk/doc";

/**
 * The flowchart "extract" symbol — an upward triangle (apex at the top), used
 * for extract/merge/marker nodes. The triangle narrows to a point at the top, so
 * its text is drawn as a label below the box, auto-sized to the text itself
 * (calcBelowLabelTextRegion) rather than squeezed into the interior.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect.
 */
export const ExtractFeatures = {
	type: "extract",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ExtractDocBrand: unique symbol;

export type ExtractDoc = CreateObjectType<
	typeof ExtractFeatures,
	typeof ExtractDocBrand
>;

export const EXTRACT_DOC_DEFAULTS: Omit<ExtractDoc, "id"> = {
	type: "extract",
	x: 0,
	y: 0,
	width: 120,
	height: 100,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	...BELOW_LABEL_STYLE_DEFAULTS,
} as const as ExtractDoc;
