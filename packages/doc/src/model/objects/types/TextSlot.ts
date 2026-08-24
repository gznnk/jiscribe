import { isObject } from "@jiscribe/basic-validators";

import type { InlineTextStyle, RichText } from "./RichText";
import {
	hasValidInlineTextStyle,
	isRichText,
	TEXT_INLINE_STYLE_KEYS,
} from "./RichText";
import type { TextAlign } from "./TextAlign";
import { isTextAlign } from "./TextAlign";
import type { VerticalAlign } from "./VerticalAlign";
import { isVerticalAlign } from "./VerticalAlign";
import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

/**
 * The content of one text slot. A `RichText` is one body of text (authored
 * newlines included) — a plain string, or the runs it is styled in when parts of
 * it are drawn differently; a `RichText[]` is a row-partitioned slot whose entries
 * are the individual rows, each a body of its own — the editor joins them with
 * "\n" and the commit splits them back, so the value's shape alone decides which
 * of the two applies ({@link isTextRows}).
 */
export type TextSlotContent = RichText | RichText[];

/**
 * One named text region of a shape: its content plus the typography it is drawn
 * with. Styling lives here and nowhere else — a shape has no shape-wide text
 * style to fall back to — so a multi-slot shape can style each region on its own.
 * The inline half of it (InlineTextStyle) is what a run of the content may
 * override for a stretch of characters; the alignment stays whole-slot, having
 * nowhere smaller to apply.
 *
 * Shared verbatim between Doc and State (like ConnectorLabel): the whole value
 * passes through the mappers unconverted for types whose doc is already keyed,
 * and is assembled from / folded back into the root TextStyleDoc fields for types
 * whose doc holds a single body (TextSlotsMapper).
 *
 * @template TContent - Narrows the content a slot accepts, for types that fix it
 *   per slot (a record's `name` is one body, its `rows` a list of them)
 */
export type TextSlot<TContent extends TextSlotContent = TextSlotContent> =
	InlineTextStyle & {
		/** The slot's text. */
		text: TContent;
		/** Horizontal text alignment */
		textAlign?: TextAlign;
		/** Vertical text alignment */
		verticalAlign?: VerticalAlign;
	};

/**
 * The style half of a text slot: everything it carries but the content. The
 * shape one slot's text-style defaults take (ObjectTextSlotStyleDefaults keys
 * them by slot id), and what the draw / edit / measure sides resolve a slot into
 * before reading a field off it (see resolveTextSlotStyle).
 */
export type TextSlotStyle = Omit<TextSlot, "text">;

/**
 * Field names of a slot's typography that place the whole block, and so have no
 * per-run counterpart.
 */
export const TEXT_BLOCK_STYLE_KEYS = ["textAlign", "verticalAlign"] as const;

/**
 * Field names of a slot's typography (everything but the content). The same
 * names the root TextStyleDoc uses, which is what lets a single-body doc expand
 * into a slot and fold back (TextSlotsMapper).
 */
export const TEXT_SLOT_STYLE_KEYS = exhaustiveKeysOf<Omit<TextSlot, "text">>()([
	...TEXT_BLOCK_STYLE_KEYS,
	...TEXT_INLINE_STYLE_KEYS,
] as const);

/**
 * Copies the style fields that are actually set, so a merge target gains no
 * `undefined`-valued keys that would shadow what it falls back to.
 *
 * @param source - Any slot or slot style; its content field is dropped either way
 * @returns A style object holding only the fields `source` sets, `{}` for none
 */
export const pickDefinedTextSlotStyle = (
	source: TextSlot | TextSlotStyle,
): TextSlotStyle => {
	const style: Record<string, unknown> = {};
	for (const key of TEXT_SLOT_STYLE_KEYS) {
		const value = source[key];
		if (value !== undefined) {
			style[key] = value;
		}
	}
	return style;
};

/**
 * The styling one slot is actually drawn with: what the slot itself sets, over
 * the defaults its object type declares. Every side that reads a style field off
 * a slot — the overlay, the editor, text measurement, the menus — resolves it
 * through here, so a field the author left unset reads the same everywhere
 * (ObjectTextStyleDefaultsRegistry).
 *
 * Neither input is materialized into the doc or the state: the result is built
 * per read, which is what keeps "unset" distinguishable from "set to the default"
 * in a saved document.
 *
 * @param defaults - The type's text-style defaults; undefined for a type that declares none, which yields the slot's own fields alone
 * @param slot - The slot, or its style half; undefined yields `defaults` as they are
 * @returns A style object; a field neither side sets stays absent, for the caller's own last resort (TEXT_STYLE_FALLBACK)
 */
export const resolveTextSlotStyle = (
	defaults: TextSlotStyle | undefined,
	slot: TextSlot | TextSlotStyle | undefined,
): TextSlotStyle => ({
	...defaults,
	...(slot === undefined ? undefined : pickDefinedTextSlotStyle(slot)),
});

/**
 * Whether a slot's content is the row-partitioned form rather than one body of
 * text. The one place the two array forms are told apart: a row is a whole body
 * (a string, or the runs it is styled in), while a styled body's entries are runs
 * (objects carrying `text`), and an empty array reads as empty rows — the form an
 * emptied row list is written back as (writeRichTextSlot), an empty body being `""`.
 *
 * @param content - Any slot content; takes `unknown` so an untrusted value can be
 *   told apart before it is known to be content at all
 * @returns True for an array of bodies, `[]` included
 */
export const isTextRows = (content: unknown): content is RichText[] =>
	Array.isArray(content) && content.every((row) => isRichText(row));

/**
 * Type guard for one text slot. Structural only: `fontColor` / `fontFamily` /
 * `fontWeight` are checked as strings, and whether the string is a real CSS
 * color and safe to inline is the state layer's boundary check
 * (`isValidTextStyleState`), which needs browser APIs this layer cannot reach.
 *
 * @param value - Value to check; a bare string (the doc's single-body form) is rejected
 * @returns True when `text` is one body of text or an array of rows and every present style field has its declared type
 */
export const isTextSlot = (value: unknown): value is TextSlot => {
	if (!isObject(value)) {
		return false;
	}
	const content = value.text;
	if (!isRichText(content) && !isTextRows(content)) {
		return false;
	}
	if (value.textAlign !== undefined && !isTextAlign(value.textAlign)) {
		return false;
	}
	if (
		value.verticalAlign !== undefined &&
		!isVerticalAlign(value.verticalAlign)
	) {
		return false;
	}
	return hasValidInlineTextStyle(value);
};
