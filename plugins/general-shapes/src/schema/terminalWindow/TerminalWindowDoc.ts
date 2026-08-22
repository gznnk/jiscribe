import { AUTO_COLOR, DEFAULT_FONT_FAMILY } from "@jiscribe/canvas-sdk/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/**
 * A terminal window (the same frame as the browser, with a shell prompt in the title bar instead of the buttons), used for CLIs and shell sessions.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect. The text is laid out inside the drawing, clear of its details.
 */
export const TerminalWindowFeatures = {
	type: "terminalWindow",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const TerminalWindowDocBrand: unique symbol;

export type TerminalWindowDoc = CreateObjectType<
	typeof TerminalWindowFeatures,
	typeof TerminalWindowDocBrand
>;

export const TERMINAL_WINDOW_DOC_DEFAULTS: Omit<TerminalWindowDoc, "id"> = {
	type: "terminalWindow",
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
} as const as TerminalWindowDoc;
