import { AUTO_COLOR, DEFAULT_FONT_FAMILY } from "@jiscribe/canvas-sdk/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/**
 * A smartphone, used for mobile clients.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect. The text is laid out inside the drawing, clear of its details.
 */
export const SmartphoneFeatures = {
	type: "smartphone",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * The screen inside the case, as fractions of the box. Shared by the silhouette
 * and the text region, which puts the text on the screen.
 */
export const SMARTPHONE_SCREEN_X_RATIO = 0.1;
export const SMARTPHONE_SCREEN_Y_RATIO = 0.09;
export const SMARTPHONE_SCREEN_WIDTH_RATIO = 0.8;
export const SMARTPHONE_SCREEN_HEIGHT_RATIO = 0.8;

/**
 * Corner radius of the case, as a fraction of the shorter side. Shared by the
 * silhouette and the outline, which rounds the same corners the drawing does.
 */
export const SMARTPHONE_CORNER_RATIO = 0.13;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SmartphoneDocBrand: unique symbol;

export type SmartphoneDoc = CreateObjectType<
	typeof SmartphoneFeatures,
	typeof SmartphoneDocBrand
>;

export const SMARTPHONE_DOC_DEFAULTS: Omit<SmartphoneDoc, "id"> = {
	type: "smartphone",
	x: 0,
	y: 0,
	width: 70,
	height: 120,
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
} as const as SmartphoneDoc;
