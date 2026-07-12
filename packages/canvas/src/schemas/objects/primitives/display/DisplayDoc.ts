import { DEFAULT_FONT_FAMILY } from "../../../../constants/defaultFontFamily";
import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import { AUTO_COLOR } from "../../utils/autoColor";

/** Depth of the pointed left edge as a fraction of the width. */
export const DISPLAY_LEFT_RATIO = 0.15;
/** Radius of the rounded right cap as a fraction of the width. */
export const DISPLAY_CAP_RATIO = 0.18;

/**
 * A display shape (a pointed left edge and a rounded right cap), used for output-to-display steps in flowcharts.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect.
 */
export const DisplayFeatures = {
	type: "display",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: true,
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DisplayDocBrand: unique symbol;

export type DisplayDoc = CreateObjectType<
	typeof DisplayFeatures,
	typeof DisplayDocBrand
>;

export const DISPLAY_DOC_DEFAULTS: Omit<DisplayDoc, "id"> = {
	type: "display",
	x: 0,
	y: 0,
	width: 140,
	height: 80,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	textType: "text",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as DisplayDoc;
