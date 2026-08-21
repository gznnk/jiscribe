import { DEFAULT_FONT_FAMILY, AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/** Length of the cut top corners as a fraction of the shorter side. */
export const LOOP_LIMIT_CUT_RATIO = 0.25;

/**
 * A loop limit (a rectangle with both top corners cut off), marking the start
 * of a loop in flowcharts. Flip vertically (flipY) to mark the loop end.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect.
 */
export const LoopLimitFeatures = {
	type: "loopLimit",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const LoopLimitDocBrand: unique symbol;

export type LoopLimitDoc = CreateObjectType<
	typeof LoopLimitFeatures,
	typeof LoopLimitDocBrand
>;

export const LOOP_LIMIT_DOC_DEFAULTS: Omit<LoopLimitDoc, "id"> = {
	type: "loopLimit",
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
} as const as LoopLimitDoc;
