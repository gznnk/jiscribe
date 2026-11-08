import type { RichText } from "../types/text/RichText";
import type { TextEmphasisStyle } from "../types/text/TextEmphasisStyle";
import type { TextSlot } from "../types/text/TextSlot";
import type { TextVerticalBasis } from "../types/text/TextVerticalBasis";
import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

/**
 * The doc form of a single-body text (features.text: "body"): the content and
 * its styling, flat on the object. The styling fields are `TextSlot`'s own —
 * derived, not copied, so the doc cannot grow a style the slot lacks — and the
 * mappers expand the group into the state's one `body` slot and fold it back on
 * save (TextSlotsMapper).
 *
 * {@link TEXT_BODY_KEYS} is what it carries beyond that: placement that belongs
 * to the shape rather than to a slot, and so stays on the object.
 */
export type TextStyleDoc = Omit<TextSlot, "text"> & {
	/** Text content to display; the run form only when part of it is styled on its own (RichText). */
	text?: RichText;
	/**
	 * Box the body's `verticalAlign` is measured against; omitted = `"region"`,
	 * the type's own declared region (see {@link TextVerticalBasis}).
	 */
	textVerticalBasis?: TextVerticalBasis;
};

/**
 * The doc form of a body written in a source language (features.text: "source"):
 * the single-body form, less what the language's own syntax already carries.
 * Derived from {@link TextStyleDoc} rather than copied, so a field added there is
 * held to the same subtraction instead of quietly going missing here.
 *
 * Two things are taken away. The content is a plain string, never the run form: a
 * shape that renders its own source draws no styled run, so a run written here
 * would be dropped on screen. And the emphasis typography (TextEmphasisStyle) is
 * gone, those being the values the syntax sets — a bold set on both sides would
 * leave the document saying one thing and the drawing showing another.
 */
export type SourceTextStyleDoc = Omit<
	TextStyleDoc,
	"text" | keyof TextEmphasisStyle
> & {
	/** Text content to display, in the shape's own source language. */
	text?: string;
};

/**
 * Field names a single-body doc carries beyond the slot's own styling
 * (`TEXT_SLOT_STYLE_KEYS`) and the content. Kept apart from the slot keys
 * because these place the shape's one body against the shape itself and have no
 * meaning inside a slot, so a `text: "slots"` type declares none of them.
 *
 * Tied to the type the same way the style-group constants are, so a field added
 * to the group and not listed here fails to compile.
 */
export const TEXT_BODY_KEYS = exhaustiveKeysOf<
	Omit<TextStyleDoc, keyof TextSlot>
>()(["textVerticalBasis"] as const);

/**
 * The doc form of a body drawn as a caption sized from its own text
 * (features.text: "label"): the single-body form less what has no meaning for a box sized from
 * its own text — `verticalAlign` and the basis it is measured against — plus the
 * color painted behind the caption. Derived from {@link TextStyleDoc} rather than
 * copied, like {@link SourceTextStyleDoc}.
 */
export type LabelTextStyleDoc = Omit<
	TextStyleDoc,
	"verticalAlign" | "textVerticalBasis"
> & {
	/**
	 * Color painted behind the caption, any CSS color. Omitted or `"auto"`
	 * (AUTO_COLOR) knocks out what lies behind it in the page's color — the
	 * document's opaque `background`, else the theme's canvas color — the way a
	 * connector's label does.
	 */
	labelFill?: string;
};

/**
 * Field names a `text: "label"` doc carries beyond the slot's own styling and
 * the content: what belongs to the caption as a whole rather than to its slot.
 * The one list the parser's known names, the doc and state validators, the
 * mappers, the style tables and `setStyle` read the field off.
 */
export const LABEL_TEXT_KEYS = exhaustiveKeysOf<
	Omit<LabelTextStyleDoc, keyof TextSlot>
>()(["labelFill"] as const);
