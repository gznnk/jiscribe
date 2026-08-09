import type { CreateObjectType, ObjectFeatures } from "@jiscribe/canvas/doc";
import { AUTO_COLOR, DEFAULT_FONT_FAMILY } from "@jiscribe/canvas-sdk/doc";

/**
 * A browser window (a frame with a title bar carrying three buttons), used for web UIs and screens.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect. The text is laid out inside the drawing, clear of its details.
 */
export const BrowserWindowFeatures = {
	type: "browserWindow",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const BrowserWindowDocBrand: unique symbol;

export type BrowserWindowDoc = CreateObjectType<
	typeof BrowserWindowFeatures,
	typeof BrowserWindowDocBrand
>;

export const BROWSER_WINDOW_DOC_DEFAULTS: Omit<BrowserWindowDoc, "id"> = {
	type: "browserWindow",
	x: 0,
	y: 0,
	width: 160,
	height: 110,
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
} as const as BrowserWindowDoc;
