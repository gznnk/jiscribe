import { DEFAULT_FONT_FAMILY, AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";
import { DEFAULT_FILL, DEFAULT_STROKE_WIDTH } from "@jiscribe/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/**
 * Width of each pointed side cap as a fraction of the width.
 * Shared by the renderer (point calculation) and the text region inset so the
 * visible caps and the text region can never drift apart.
 */
export const HEXAGON_CAP_RATIO = 0.2;

/**
 * A hexagon with pointed left/right caps, used for preparation steps in
 * flowcharts and for generic emphasis nodes.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering for a
 * hexagonal polygon. This lets it reuse Frame-based transforms and connector
 * outline connections with the same mechanism as Rect.
 */
export const HexagonFeatures = {
	type: "hexagon",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const HexagonDocBrand: unique symbol;

export type HexagonDoc = CreateObjectType<
	typeof HexagonFeatures,
	typeof HexagonDocBrand
>;

export const HEXAGON_DOC_DEFAULTS: Omit<HexagonDoc, "id"> = {
	type: "hexagon",
	x: 0,
	y: 0,
	width: 140,
	height: 80,
	fill: DEFAULT_FILL,
	stroke: AUTO_COLOR,
	strokeWidth: DEFAULT_STROKE_WIDTH,
	text: "",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as HexagonDoc;
