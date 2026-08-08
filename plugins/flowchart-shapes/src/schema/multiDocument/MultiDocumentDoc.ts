import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas/doc";
import { DEFAULT_FONT_FAMILY, AUTO_COLOR } from "@workspace/canvas-sdk/doc";

/**
 * Offset between stacked sheets as a fraction of the shorter side. Two back
 * sheets consume twice this offset from the top/right of the bounding box.
 */
export const MULTI_DOCUMENT_OFFSET_RATIO = 0.08;

/**
 * A multi-document (three stacked document sheets), used for report batches /
 * file sets in flowcharts. The front sheet sits at the bottom-left and the two
 * back sheets step up toward the top-right.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect.
 */
export const MultiDocumentFeatures = {
	type: "multiDocument",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const MultiDocumentDocBrand: unique symbol;

export type MultiDocumentDoc = CreateObjectType<
	typeof MultiDocumentFeatures,
	typeof MultiDocumentDocBrand
>;

export const MULTI_DOCUMENT_DOC_DEFAULTS: Omit<MultiDocumentDoc, "id"> = {
	type: "multiDocument",
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
} as const as MultiDocumentDoc;
