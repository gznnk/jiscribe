import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas/doc";
import { AUTO_COLOR, DEFAULT_FONT_FAMILY } from "@workspace/canvas-sdk/doc";

/**
 * A laptop, used for desktop and web clients.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect. The text is laid out inside the drawing, clear of its details.
 */
export const LaptopFeatures = {
	type: "laptop",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * The screen above the base, as fractions of the box. Shared by the silhouette
 * and the text region, which puts the text on the screen; the base occupies the
 * band below it and is what makes the box wider than the screen.
 */
export const LAPTOP_SCREEN_X_RATIO = 0.12;
export const LAPTOP_SCREEN_WIDTH_RATIO = 0.76;
export const LAPTOP_SCREEN_HEIGHT_RATIO = 0.72;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const LaptopDocBrand: unique symbol;

export type LaptopDoc = CreateObjectType<
	typeof LaptopFeatures,
	typeof LaptopDocBrand
>;

export const LAPTOP_DOC_DEFAULTS: Omit<LaptopDoc, "id"> = {
	type: "laptop",
	x: 0,
	y: 0,
	width: 140,
	height: 100,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 14,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as LaptopDoc;
