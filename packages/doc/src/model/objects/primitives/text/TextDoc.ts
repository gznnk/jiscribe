import { DEFAULT_FONT_FAMILY } from "../../../../text/style/fontFamilies";
import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import type { TextLayout } from "../../types/TextLayout";
import { AUTO_COLOR } from "../../utils/autoColor";

/**
 * Text standing on its own, with no box drawn around it.
 *
 * `geometry: "point"` because the box is the text's own extent: the doc stores
 * the drawn top-left corner — the local (-w/2, -h/2) corner with the object's
 * rotation and flips applied — and nothing else, and width/height are measured
 * from the content (see calcTextObjectFrameSize). The block layout stores a
 * width on top of that geometry ({@link TextLayoutDoc}), leaving the height the
 * measured one. `transform` stays on so the shape is still a TransformedFrame
 * for selection, snapping and bboxes; the resize handles are what gets turned
 * off, in the type's `transformHandles`.
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

/**
 * Fields the block layout adds on top of the point geometry (see
 * ObjectDocDefinition.extraKeys). Both are absent from a label text, which is
 * what an omitted `textLayout` means, so a document written before the mode
 * existed keeps the layout it was written for.
 */
export type TextLayoutDoc = {
	/** Where the text wraps; omitted = "label" (breaks at authored newlines only). */
	textLayout?: TextLayout;
	/**
	 * Box width the text wraps in, in px, padding included. Required by — and
	 * allowed only in — the block layout (`validateTextDoc` refuses it on a
	 * label, where nothing reads it); the height stays measured from the wrapped
	 * lines and is never stored.
	 */
	width?: number;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const TextDocBrand: unique symbol;

export type TextDoc = CreateObjectType<
	typeof TextFeatures,
	typeof TextDocBrand,
	TextLayoutDoc
>;

/** Doc fields text carries beyond the ones its features imply (see ObjectDocDefinition.extraKeys). */
export const TEXT_EXTRA_KEYS = [
	"textLayout",
	"width",
] as const satisfies readonly (keyof TextDoc)[];

/**
 * Left-aligned and top-aligned because the box hugs the text: with no slack in
 * either direction, centering would be indistinguishable from this on a single
 * line and would only shift the shorter lines of a multi-line body. The block
 * layout keeps both: its width is stored rather than hugged, but the text still
 * starts at the top-left corner the doc pins.
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
