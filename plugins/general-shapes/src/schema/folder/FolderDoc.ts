import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas/doc";
import {
	AUTO_COLOR,
	DEFAULT_FONT_FAMILY,
} from "@workspace/canvas/unstable-doc";

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
 * the tab's slanted right edge, as a fraction of the tab height.
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
