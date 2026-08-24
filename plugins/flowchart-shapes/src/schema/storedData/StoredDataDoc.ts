import { DEFAULT_FONT_FAMILY, AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/**
 * Horizontal depth of the side arcs as a fraction of the width. Both side
 * edges bow toward the left by this depth; the left arc's apex touches the
 * bounding-box left edge. Shared by the renderer (path) and the text region
 * inset so the visible arcs and the text region can never drift apart.
 */
export const STORED_DATA_CAP_RATIO = 0.125;

/**
 * Stored data (a rectangle whose left/right edges both bow left, like a drum
 * segment), the generic storage symbol in flowcharts for files / caches that
 * are not specifically a database.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect.
 */
export const StoredDataFeatures = {
	type: "storedData",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const StoredDataDocBrand: unique symbol;

export type StoredDataDoc = CreateObjectType<
	typeof StoredDataFeatures,
	typeof StoredDataDocBrand
>;

export const STORED_DATA_DOC_DEFAULTS: Omit<StoredDataDoc, "id"> = {
	type: "storedData",
	x: 0,
	y: 0,
	width: 140,
	height: 80,
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
} as const as StoredDataDoc;
