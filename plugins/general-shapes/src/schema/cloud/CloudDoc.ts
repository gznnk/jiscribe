import type { CreateObjectType, ObjectFeatures } from "@jiscribe/canvas/doc";
import { AUTO_COLOR, DEFAULT_FONT_FAMILY } from "@jiscribe/canvas-sdk/doc";

/**
 * A cloud used for external systems / networks in architecture diagrams and
 * for fuzzy concepts in brainstorming.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering for a
 * bumpy cloud path. This lets it reuse Frame-based transforms and connector
 * outline connections with the same mechanism as Rect.
 */
/** Ratio insets that keep text clear of the bumps eating into the bounding box. */
export const CLOUD_TEXT_INSETS = {
	top: 0.2,
	right: 0.15,
	bottom: 0.2,
	left: 0.15,
};

export const CloudFeatures = {
	type: "cloud",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CloudDocBrand: unique symbol;

export type CloudDoc = CreateObjectType<
	typeof CloudFeatures,
	typeof CloudDocBrand
>;

export const CLOUD_DOC_DEFAULTS: Omit<CloudDoc, "id"> = {
	type: "cloud",
	x: 0,
	y: 0,
	width: 160,
	height: 100,
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
} as const as CloudDoc;
