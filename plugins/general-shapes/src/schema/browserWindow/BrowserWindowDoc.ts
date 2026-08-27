import { AUTO_COLOR, DEFAULT_FONT_FAMILY } from "@jiscribe/canvas-sdk/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/**
 * A browser window: the pictogram that stands for a web UI in a diagram.
 *
 * Like every pictogram its details are drawn as fractions of the box — the title bar
 * takes WINDOW_TITLE_BAR_RATIO of the height and the three buttons a fraction of that —
 * so it reads at around its default size and turns into a giant bar with giant buttons
 * when blown up to the size of an actual screen. It is a symbol to point at, not a frame
 * to lay a screen out inside: for a mockup, draw the regions with `rect` (or `container`
 * for a titled one) and leave this to the node that means "the web UI".
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
