import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas/doc";
import {
	DEFAULT_FONT_FAMILY,
	AUTO_COLOR,
} from "@workspace/canvas/unstable-doc";

/**
 * A delay shape (a rectangle whose right edge is a semicircular bulge), used for wait/delay steps in flowcharts.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect.
 */
export const DelayFeatures = {
	type: "delay",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: true,
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DelayDocBrand: unique symbol;

export type DelayDoc = CreateObjectType<
	typeof DelayFeatures,
	typeof DelayDocBrand
>;

export const DELAY_DOC_DEFAULTS: Omit<DelayDoc, "id"> = {
	type: "delay",
	x: 0,
	y: 0,
	width: 140,
	height: 80,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	textType: "text",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as DelayDoc;
