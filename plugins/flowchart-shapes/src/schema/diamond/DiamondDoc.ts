import type { CreateObjectType, ObjectFeatures } from "@jiscribe/canvas/doc";
import { DEFAULT_FONT_FAMILY, AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";

/**
 * A diamond used for conditional branches in flowcharts.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering for a
 * diamond polygon. This lets it reuse Frame-based transforms, text (placed across the
 * entire bounding box), and connector outline connections with the same mechanism as Rect.
 * A diamond needs no rounded corners, so it has no radius.
 */
/**
 * Inset that lands the text region's corners on the diamond edges: a centered
 * rect of half the width and half the height (its corners satisfy x/a + y/b = 1).
 */
export const DIAMOND_INSET = 0.25;

export const DiamondFeatures = {
	type: "diamond",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DiamondDocBrand: unique symbol;

export type DiamondDoc = CreateObjectType<
	typeof DiamondFeatures,
	typeof DiamondDocBrand
>;

export const DIAMOND_DOC_DEFAULTS: Omit<DiamondDoc, "id"> = {
	type: "diamond",
	x: 0,
	y: 0,
	width: 120,
	height: 80,
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
} as const as DiamondDoc;
