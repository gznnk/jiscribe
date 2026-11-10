import { TEXT_EMPHASIS_STYLE_KEYS } from "./TextEmphasisStyle";
import type { TextSlotStyle } from "./TextSlot";
import { TEXT_SLOT_STYLE_KEYS } from "./TextSlot";

/**
 * How a type holds its text — the value of `ObjectFeatures.text`, which a type
 * holding no text leaves out. Not the kinds of the `text` object, which are its
 * layouts (TextLayout).
 * - 'body': One body on the object itself (root-form doc, TextStyleDoc). The
 *   body may be styled in runs and takes the slot's whole typography.
 * - 'source': The same single body, written in a language the shape renders
 *   itself (SourceTextStyleDoc). A plain string only, and no emphasis
 *   typography, both being what the language's own syntax carries.
 * - 'label': The same single body as 'body', as a caption sized from its own
 *   text (LabelTextStyleDoc) rather than laid out inside the box. The core hangs
 *   it below the box (calcLabelTextRegion) unless the type's UI definition
 *   places it itself; the doc declares no region either way, and the body takes
 *   no `verticalAlign`, having no box of fixed height to move through.
 * - 'innerLabel': A caption sized from its own text like 'label', placed by the
 *   shape on itself — inside its box, over its own fill (InnerLabelTextStyleDoc).
 *   It has no default place, so the UI definition always places it, and no
 *   `labelFill`, there being no lines under it to knock out.
 * - 'slots': Named slots (keyed-form doc), each a TextSlot styled on its own;
 *   the slot set is closed and spelled out by the type.
 */
export type TextType = "body" | "source" | "label" | "innerLabel" | "slots";

/**
 * Whether the type holds its text as a caption sized from its own text — `"label"`
 * and `"innerLabel"` alike: a single body taking no `verticalAlign`, on a `"rect"`
 * geometry, whose doc declares no region.
 *
 * @param textType - The type's `ObjectFeatures.text`; `undefined`, which is a
 *   type holding no text at all, is false
 * @returns True for `"label"` and `"innerLabel"`, false for every other text type and `undefined`
 */
export const isCaptionText = (textType: TextType | undefined): boolean =>
	textType === "label" || textType === "innerLabel";

/**
 * Whether the type's caption carries `labelFill`, the color painted behind it to
 * knock out the lines running under it. Only a `"label"` caption does; an
 * `"innerLabel"` one sits on the shape's own fill.
 *
 * @param textType - The type's `ObjectFeatures.text`; `undefined`, which is a
 *   type holding no text at all, is false
 * @returns True for `"label"` only; see {@link isCaptionText} for the question both caption types answer
 */
export const hasLabelFill = (textType: TextType | undefined): boolean =>
	textType === "label";

/**
 * Whether the type holds its text as one body on the object itself rather than in
 * named slots — the root-form docs, `"body"`, `"source"`, `"label"` and `"innerLabel"` alike. Every side
 * asking "is there a single text here to read, write or place" asks it through
 * this, so the two cannot drift apart on the question.
 *
 * @param textType - The type's `ObjectFeatures.text`; `undefined`, which is a
 *   type holding no text at all, is false
 * @returns True for `"body"`, `"source"`, `"label"` and `"innerLabel"`, false for `"slots"` and `undefined`
 */
export const isSingleBodyText = (textType: TextType | undefined): boolean =>
	textType === "body" || textType === "source" || isCaptionText(textType);

/**
 * The style fields a text of this type accepts, in the order
 * `TEXT_SLOT_STYLE_KEYS` declares them. The single answer every side that admits,
 * writes or reads a text style goes through, so what `setStyle` lets through
 * cannot drift from what a doc of the type may hold.
 *
 * A `"source"` text takes the whole set less the emphasis half
 * (`TEXT_EMPHASIS_STYLE_KEYS`): its body is written in a language whose own
 * syntax sets those, and a value set on both sides would leave the document
 * saying one thing and the drawing showing another. A caption (`"label"` /
 * `"innerLabel"`, isCaptionText) takes the whole set less `verticalAlign`: its box is sized from the text, so there is no
 * slack for the block to be placed in.
 *
 * @param textType - The type's `ObjectFeatures.text`; `undefined`, which is a
 *   type holding no text at all, yields an empty array
 * @returns The accepted field names, a fresh array the caller may keep
 */
export const textStyleKeysOf = (
	textType: TextType | undefined,
): (keyof TextSlotStyle)[] => {
	if (textType === undefined) {
		return [];
	}
	if (isCaptionText(textType)) {
		return TEXT_SLOT_STYLE_KEYS.filter((key) => key !== "verticalAlign");
	}
	if (textType !== "source") {
		return [...TEXT_SLOT_STYLE_KEYS];
	}
	return TEXT_SLOT_STYLE_KEYS.filter(
		(key) => !(TEXT_EMPHASIS_STYLE_KEYS as readonly string[]).includes(key),
	);
};

/**
 * Whether a text of this type takes any of the emphasis fields — bold, italic and
 * the decoration lines (`TEXT_EMPHASIS_STYLE_KEYS`). The emphasis half is all or
 * nothing: the base fields and the alignment are taken by every text type, so
 * this is the only axis on which the types differ in what they may be styled with.
 *
 * @param textType - The type's `ObjectFeatures.text`; `undefined`, which is a
 *   type holding no text at all, is false
 * @returns True for `"body"`, `"label"`, `"innerLabel"` and `"slots"`, false for `"source"` and `undefined`
 */
export const acceptsTextEmphasisStyle = (
	textType: TextType | undefined,
): boolean => {
	const accepted = textStyleKeysOf(textType) as readonly string[];
	return TEXT_EMPHASIS_STYLE_KEYS.some((key) => accepted.includes(key));
};
