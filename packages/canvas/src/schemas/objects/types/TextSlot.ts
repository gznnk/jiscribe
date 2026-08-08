import { isNumber, isObject, isString } from "@workspace/basic-validators";

import type { TextAlign } from "./TextAlign";
import { isTextAlign } from "./TextAlign";
import type { VerticalAlign } from "./VerticalAlign";
import { isVerticalAlign } from "./VerticalAlign";
import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

/**
 * The content of one text slot. A `string` is one body of text (authored
 * newlines included); a `string[]` is a row-partitioned slot whose entries are
 * the individual rows — the editor joins them with "\n" and the commit splits
 * them back, so the value's shape alone decides which of the two applies.
 */
export type TextSlotContent = string | string[];

/**
 * One named text region of a shape: its content plus the typography it is drawn
 * with. Styling lives here and nowhere else — a shape has no shape-wide text
 * style to fall back to — so a multi-slot shape can style each region on its own.
 *
 * Shared verbatim between Doc and State (like ConnectorLabel): the whole value
 * passes through the mappers unconverted for types whose doc is already keyed,
 * and is assembled from / folded back into the root TextStyleDoc fields for types
 * whose doc holds a single body (TextSlotsMapper).
 *
 * @template TContent - Narrows the content a slot accepts, for types that fix it
 *   per slot (a record's `name` is a `string`, its `rows` a `string[]`)
 */
export type TextSlot<TContent extends TextSlotContent = TextSlotContent> = {
	/** The slot's text. */
	text: TContent;
	/** Horizontal text alignment */
	textAlign?: TextAlign;
	/** Vertical text alignment */
	verticalAlign?: VerticalAlign;
	/** Text color (CSS color string) */
	fontColor?: string;
	/** Font size in pixels */
	fontSize?: number;
	/** Font family */
	fontFamily?: string;
	/** Font weight */
	fontWeight?: string;
	/** Font style ("normal" | "italic"; CSS font-style value) */
	fontStyle?: string;
	/**
	 * Text decoration lines: "underline" / "line-through", space-separated when
	 * both apply (canonical order: underline first). "none" or absent means no
	 * decoration.
	 */
	textDecoration?: string;
};

/**
 * Field names of a slot's typography (everything but the content). The same
 * names the root TextStyleDoc uses, which is what lets a single-body doc expand
 * into a slot and fold back (TextSlotsMapper).
 */
export const TEXT_SLOT_STYLE_KEYS = exhaustiveKeysOf<Omit<TextSlot, "text">>()([
	"textAlign",
	"verticalAlign",
	"fontColor",
	"fontSize",
	"fontFamily",
	"fontWeight",
	"fontStyle",
	"textDecoration",
] as const);

/**
 * Type guard for one text slot. Structural only: `fontColor` / `fontFamily` /
 * `fontWeight` are checked as strings, and whether the string is a real CSS
 * color and safe to inline is the state layer's boundary check
 * (`isValidTextStyleState`), which needs browser APIs this layer cannot reach.
 *
 * @param value - Value to check; a bare string (the doc's single-body form) is rejected
 * @returns True when `text` is a string or an array of strings and every present style field has its declared type
 */
export const isTextSlot = (value: unknown): value is TextSlot => {
	if (!isObject(value)) {
		return false;
	}
	const content = value.text;
	if (
		!isString(content) &&
		!(Array.isArray(content) && content.every((row) => isString(row)))
	) {
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
	if (value.fontColor !== undefined && !isString(value.fontColor)) {
		return false;
	}
	if (value.fontSize !== undefined && !isNumber(value.fontSize)) {
		return false;
	}
	if (value.fontFamily !== undefined && !isString(value.fontFamily)) {
		return false;
	}
	if (value.fontWeight !== undefined && !isString(value.fontWeight)) {
		return false;
	}
	if (value.fontStyle !== undefined && !isString(value.fontStyle)) {
		return false;
	}
	if (value.textDecoration !== undefined && !isString(value.textDecoration)) {
		return false;
	}
	return true;
};
