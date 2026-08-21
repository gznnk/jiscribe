import { DEFAULT_FONT_FAMILY, AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/**
 * Horizontal offset of the slanted sides as a fraction of the width.
 * Shared by the renderer (point calculation) and the text region inset so the
 * visible slant and the text region can never drift apart.
 */
export const PARALLELOGRAM_SKEW_RATIO = 0.22;

/**
 * A parallelogram used for input / output steps in flowcharts.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering for a
 * slanted polygon (top edge shifted right). This lets it reuse Frame-based
 * transforms and connector outline connections with the same mechanism as Rect.
 */
export const ParallelogramFeatures = {
	type: "parallelogram",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ParallelogramDocBrand: unique symbol;

export type ParallelogramDoc = CreateObjectType<
	typeof ParallelogramFeatures,
	typeof ParallelogramDocBrand
>;

export const PARALLELOGRAM_DOC_DEFAULTS: Omit<ParallelogramDoc, "id"> = {
	type: "parallelogram",
	x: 0,
	y: 0,
	width: 140,
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
} as const as ParallelogramDoc;
