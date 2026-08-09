import type { CreateObjectType, ObjectFeatures } from "@jiscribe/canvas/doc";
import { AUTO_COLOR, DEFAULT_FONT_FAMILY } from "@jiscribe/canvas-sdk/doc";

/**
 * A folder with a tab on its top-left corner, used for directories and for grouping.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect. The text is laid out inside the drawing, clear of its details.
 */
export const FolderFeatures = {
	type: "folder",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * Tab geometry, shared by the silhouette (calcFolderPoints) and the text region.
 * Height and width are fractions of the box; the slope is the horizontal run of
 * the tab's slanted right edge, as a fraction of the tab height the *shorter*
 * side would give it.
 *
 * The run is taken from the shorter side rather than from the height because it
 * is a horizontal length: derived from the height alone it grows with a tall box
 * while the tab's left edge stays at FOLDER_TAB_WIDTH_RATIO of the width, so
 * past roughly 1:4.8 the slant runs out past the right edge of the box and the
 * drawing escapes its own selection frame (a 100x600 box overshot by 15.6px).
 * On a box at least as wide as it is tall — every default size included — the
 * shorter side is the height, so nothing changes.
 */
export const FOLDER_TAB_HEIGHT_RATIO = 0.18;
export const FOLDER_TAB_WIDTH_RATIO = 0.4;
export const FOLDER_TAB_SLOPE_RATIO = 0.7;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const FolderDocBrand: unique symbol;

export type FolderDoc = CreateObjectType<
	typeof FolderFeatures,
	typeof FolderDocBrand
>;

export const FOLDER_DOC_DEFAULTS: Omit<FolderDoc, "id"> = {
	type: "folder",
	x: 0,
	y: 0,
	width: 130,
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
} as const as FolderDoc;
