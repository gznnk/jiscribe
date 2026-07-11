import { DEFAULT_FONT_FAMILY } from "../../../../constants/defaultFontFamily";
import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import { AUTO_COLOR } from "../../utils/autoColor";

/**
 * Height of the tail band as a fraction of the height. The bubble body fills
 * the rest and the tail stays inside the bounding box. Shared by the renderer
 * (path) and the text region inset so the visible body and the text region can
 * never drift apart.
 */
export const CALLOUT_TAIL_RATIO = 0.25;

/**
 * A speech-bubble callout used for annotations and explanatory comments.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering for a
 * bubble with a fixed tail pointing down-left, drawn inside the bounding box so
 * selection, transforms, and connector outline connections work with the same
 * mechanism as Rect. The text region is the bubble body above the tail band.
 */
export const CalloutFeatures = {
	type: "callout",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: true,
	connectable: true,
	textRegion: { unit: "ratio", inset: { bottom: CALLOUT_TAIL_RATIO } },
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CalloutDocBrand: unique symbol;

export type CalloutDoc = CreateObjectType<
	typeof CalloutFeatures,
	typeof CalloutDocBrand
>;

export const CALLOUT_DOC_DEFAULTS: Omit<CalloutDoc, "id"> = {
	type: "callout",
	x: 0,
	y: 0,
	width: 160,
	height: 110,
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
} as const as CalloutDoc;
