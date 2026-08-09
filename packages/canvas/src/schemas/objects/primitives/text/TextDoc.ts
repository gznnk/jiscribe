import { DEFAULT_FONT_FAMILY } from "../../../../constants/defaultFontFamily";
import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import { AUTO_COLOR } from "../../utils/autoColor";

/**
 * Text standing on its own, with no box drawn around it.
 *
 * `geometry: "point"` because the box is the text's own extent: the doc stores
 * the top-left corner and nothing else, and width/height are measured from the
 * content (see calcTextObjectFrameSize). `transform` stays on so the shape is
 * still a TransformedFrame for selection, snapping and bboxes; the resize
 * handles are what gets turned off, in the type's `transformHandles`.
 */
export const TextFeatures = {
	type: "text",
	geometry: "point",
	transform: true,
	text: "body",
	stroke: false,
	fill: false,
	radius: false,
	arrow: false,
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const TextDocBrand: unique symbol;

export type TextDoc = CreateObjectType<
	typeof TextFeatures,
	typeof TextDocBrand
>;

/**
 * Left-aligned and top-aligned because the box hugs the text: with no slack in
 * either direction, centering would be indistinguishable from this on a single
 * line and would only shift the shorter lines of a multi-line body.
 */
export const TEXT_DOC_DEFAULTS: Omit<TextDoc, "id"> = {
	type: "text",
	x: 0,
	y: 0,
	text: "",
	textAlign: "left",
	verticalAlign: "top",
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as TextDoc;
