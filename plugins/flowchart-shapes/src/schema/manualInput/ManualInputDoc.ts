import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas/doc";
import { DEFAULT_FONT_FAMILY, AUTO_COLOR } from "@workspace/canvas-sdk/doc";

/** Height of the sloping top edge as a fraction of the height (shared by renderer and text region). */
export const MANUAL_INPUT_SLOPE_RATIO = 0.25;

/**
 * A manual-input shape (a rectangle whose top edge slopes up toward the right), used for keyed/manual entry steps.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect.
 */
export const ManualInputFeatures = {
	type: "manualInput",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ManualInputDocBrand: unique symbol;

export type ManualInputDoc = CreateObjectType<
	typeof ManualInputFeatures,
	typeof ManualInputDocBrand
>;

export const MANUAL_INPUT_DOC_DEFAULTS: Omit<ManualInputDoc, "id"> = {
	type: "manualInput",
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
} as const as ManualInputDoc;
