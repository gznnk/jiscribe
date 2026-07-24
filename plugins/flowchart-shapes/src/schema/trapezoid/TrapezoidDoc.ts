import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas";
import { DEFAULT_FONT_FAMILY, AUTO_COLOR } from "@workspace/canvas/unstable";

/** How far each bottom corner is inset from the top corner, as a fraction of the width. */
export const TRAPEZOID_SLOPE_RATIO = 0.2;

/**
 * A trapezoid (wide top, narrow bottom), used for manual-operation steps in flowcharts.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect.
 */
export const TrapezoidFeatures = {
	type: "trapezoid",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: true,
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const TrapezoidDocBrand: unique symbol;

export type TrapezoidDoc = CreateObjectType<
	typeof TrapezoidFeatures,
	typeof TrapezoidDocBrand
>;

export const TRAPEZOID_DOC_DEFAULTS: Omit<TrapezoidDoc, "id"> = {
	type: "trapezoid",
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
} as const as TrapezoidDoc;
