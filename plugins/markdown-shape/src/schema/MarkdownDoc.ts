import { DEFAULT_FONT_FAMILY, AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/**
 * A card whose `text` is Markdown source, rendered as HTML.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering of
 * the body for rendered Markdown, so Frame-based transforms, text editing, and
 * connector outline connections work exactly as they do for Rect. Being its own
 * type is what makes the rendering mode addressable by name: the body is
 * Markdown because `type` says so, not because a flag was set on a rectangle.
 *
 * The defaults differ from Rect where the document-ish reading order demands it
 * — a larger box, left/top aligned text, and a theme-following fill so the card
 * reads as a page rather than an outline.
 */
export const MarkdownFeatures = {
	type: "markdown",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	radius: true,
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const MarkdownDocBrand: unique symbol;

export type MarkdownDoc = CreateObjectType<
	typeof MarkdownFeatures,
	typeof MarkdownDocBrand
>;

export const MARKDOWN_DOC_DEFAULTS: Omit<MarkdownDoc, "id"> = {
	type: "markdown",
	x: 0,
	y: 0,
	width: 300,
	height: 200,
	fill: AUTO_COLOR,
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	rx: 0,
	text: "",
	textAlign: "left",
	verticalAlign: "top",
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as MarkdownDoc;
