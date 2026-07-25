import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas/doc";
import {
	DEFAULT_FONT_FAMILY,
	AUTO_COLOR,
} from "@workspace/canvas/unstable-doc";

/**
 * Amplitude of the bottom wave as a fraction of the height. The wave band
 * spans twice this ratio and its lowest point touches the bounding-box bottom.
 * Shared by the renderer (path) and the text region inset so the visible wave
 * and the text region can never drift apart.
 */
export const DOCUMENT_WAVE_RATIO = 0.075;

/**
 * A document (rect with a wavy bottom edge) used for reports / files in
 * flowcharts and for deliverables in business diagrams.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering for a
 * wavy-bottomed path. This lets it reuse Frame-based transforms and connector
 * outline connections with the same mechanism as Rect.
 */
export const DocumentFeatures = {
	type: "document",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: true,
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DocumentDocBrand: unique symbol;

export type DocumentDoc = CreateObjectType<
	typeof DocumentFeatures,
	typeof DocumentDocBrand
>;

export const DOCUMENT_DOC_DEFAULTS: Omit<DocumentDoc, "id"> = {
	type: "document",
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
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as DocumentDoc;
