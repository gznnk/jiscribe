import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas/doc";
import { AUTO_COLOR } from "@workspace/canvas/unstable-doc";

/**
 * The flowchart "extract" symbol — an upward triangle (apex at the top), used
 * for extract/merge/marker nodes. It holds no text (no `text` feature).
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect.
 */
export const ExtractFeatures = {
	type: "extract",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ExtractDocBrand: unique symbol;

export type ExtractDoc = CreateObjectType<
	typeof ExtractFeatures,
	typeof ExtractDocBrand
>;

export const EXTRACT_DOC_DEFAULTS: Omit<ExtractDoc, "id"> = {
	type: "extract",
	x: 0,
	y: 0,
	width: 120,
	height: 100,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
} as const as ExtractDoc;
