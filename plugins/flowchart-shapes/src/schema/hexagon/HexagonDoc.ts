import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas";
import { DEFAULT_FONT_FAMILY, AUTO_COLOR } from "@workspace/canvas/unstable";

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
	text: true,
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
} as const as HexagonDoc;
