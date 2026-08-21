import { DEFAULT_FONT_FAMILY, AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/**
 * A stadium (pill) used for start / end terminators in flowcharts.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering for a
 * fully-rounded rect (corner radius = half the short side). This lets it reuse
 * Frame-based transforms and connector outline connections with the same
 * mechanism as Rect.
 */
export const StadiumFeatures = {
	type: "stadium",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const StadiumDocBrand: unique symbol;

export type StadiumDoc = CreateObjectType<
	typeof StadiumFeatures,
	typeof StadiumDocBrand
>;

export const STADIUM_DOC_DEFAULTS: Omit<StadiumDoc, "id"> = {
	type: "stadium",
	x: 0,
	y: 0,
	width: 140,
	height: 60,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as StadiumDoc;
