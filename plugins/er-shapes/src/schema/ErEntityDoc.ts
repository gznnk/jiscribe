import {
	AUTO_COLOR,
	TEXT_BOX_PADDING_Y,
	TEXT_LINE_HEIGHT,
} from "@jiscribe/canvas-sdk/doc";
import { DEFAULT_STROKE_WIDTH } from "@jiscribe/doc";
import type {
	CreateObjectType,
	ObjectFeatures,
	RichText,
	TextSlot,
	TextSlotStyle,
} from "@jiscribe/doc";

/**
 * An entity of an ER diagram (IE notation): a title band over the columns'
 * rows, drawn in declared order.
 *
 * `geometry: "point"` because the doc stores the drawn top-left corner and the
 * widths of the three slots of a row, but no box: the width is the slot widths
 * summed and the height follows from the column count and the type size
 * (calcErEntityLayout), so a stored one could only disagree with them.
 *
 * `text: "slots"` describes the **state**, where the title and the three texts of
 * every column are text slots (erEntityColumnTextSlotId). The doc spells them out
 * as `name` and `columns` instead, so the file reads as a table definition; the
 * mapper moves between the two forms.
 */
export const ErEntityFeatures = {
	type: "erEntity",
	geometry: "point",
	transform: true,
	stroke: true,
	fill: true,
	text: "slots",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * One text of an entity (the title, or a column's key, name or type), in either
 * of the two forms a document may write: the text alone, or the slot object
 * carrying its own typography (the table cell's two forms). The entity holds no
 * typography of its own.
 */
export type ErEntityTextDoc = RichText | TextSlot<RichText>;

/** One column of the entity: three texts, the name alone required. */
export type ErEntityColumnDoc = {
	/**
	 * What the key gutter shows (`PK`, `FK`, `PK, FK`, `UK` …). Free text, drawn
	 * as written and not interpreted by the shape. Omitted = no key.
	 */
	key?: ErEntityTextDoc;
	/** Column name, drawn left-aligned right of the key gutter. */
	name: ErEntityTextDoc;
	/** Column type, left-aligned in the type column at the right; nullability is written here in SQL words (`varchar(80) null`). Omitted = no type. */
	type?: ErEntityTextDoc;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ErEntityDocBrand: unique symbol;

export type ErEntityDoc = CreateObjectType<
	typeof ErEntityFeatures,
	typeof ErEntityDocBrand,
	{
		/** Key gutter width in px, at least {@link ER_ENTITY_MIN_SLOT_WIDTH}; drawn (with the box) at the widest key's width while that is wider, the stated value kept as written. Omitted = sized to the widest key, following it as the keys change (calcErEntitySlotFloors); written by a drag on the key / name boundary. */
		keyWidth?: number;
		/** Name column width in px, at least {@link ER_ENTITY_MIN_SLOT_WIDTH}; drawn (with the box) at the longest column name's width while that is wider, the stated value kept as written — so a saved value may be narrower than what is drawn, and the drawing follows the texts back down to it. Omitted = {@link ER_ENTITY_DEFAULT_NAME_WIDTH}. */
		nameWidth?: number;
		/** Type column width in px, at least {@link ER_ENTITY_MIN_TYPE_WIDTH}; drawn at the longest type's width while that is wider, the stated value kept as written (see `nameWidth`). Omitted = {@link ER_ENTITY_DEFAULT_TYPE_WIDTH}. */
		typeWidth?: number;
		/** Entity name, drawn in the title band. */
		name: ErEntityTextDoc;
		/** The columns, drawn top to bottom in this order whatever their keys. */
		columns: ErEntityColumnDoc[];
	}
>;

/** Doc fields the type carries beyond what its features imply. */
export const ER_ENTITY_EXTRA_KEYS = [
	"keyWidth",
	"nameWidth",
	"typeWidth",
	"name",
	"columns",
] as const satisfies readonly (keyof ErEntityDoc)[];

/** Narrowest an entity may be, in px, whatever its texts: the floor under the content-derived minimum (calcErEntityMinWidth). The name column takes what three narrower slots fall short of it. */
export const ER_ENTITY_MIN_WIDTH = 120;

/** Name column width in px while `nameWidth` is not stated: wide enough for the stencil's longest name (`created_at`) at the default type size. */
export const ER_ENTITY_DEFAULT_NAME_WIDTH = 96;

/** Type column width in px while `typeWidth` is not stated: wide enough for the stencil's longest type (`varchar(100)`) at the default type size. */
export const ER_ENTITY_DEFAULT_TYPE_WIDTH = 104;

/** Type size an entity's texts are drawn at unless a text states its own. */
export const ER_ENTITY_FONT_SIZE = 14;

/**
 * Local pixels the title band adds around its text in total: the shared text
 * box's vertical padding plus breathing room (the record's band metric).
 */
export const ER_ENTITY_HEADER_PADDING_Y_TOTAL = 7;

/**
 * Narrowest any of a row's three slots (key gutter, name, type) is drawn, in px, however short its texts:
 * a slot is where its text is written by double-clicking, so it must stay
 * hittable — the key gutter even when no column has a key.
 */
export const ER_ENTITY_MIN_SLOT_WIDTH = 24;

/** Narrowest the type column is drawn, in px, however short its texts. */
export const ER_ENTITY_MIN_TYPE_WIDTH = 60;

/** The doc fields stating a slot width, in the order a row lays the slots out: key gutter, name, type. */
export const ER_ENTITY_SLOT_WIDTH_KEYS = [
	"keyWidth",
	"nameWidth",
	"typeWidth",
] as const satisfies readonly (keyof ErEntityDoc)[];

/**
 * Narrowest each of a row's three slots is drawn and may be stated, in px, keyed
 * by the doc field stating its width: what the doc validator, the state
 * validator and the measured floors (calcErEntitySlotFloors) all hold a slot to.
 */
export const ER_ENTITY_MIN_SLOT_WIDTHS = {
	keyWidth: ER_ENTITY_MIN_SLOT_WIDTH,
	nameWidth: ER_ENTITY_MIN_SLOT_WIDTH,
	typeWidth: ER_ENTITY_MIN_TYPE_WIDTH,
} as const satisfies Record<(typeof ER_ENTITY_SLOT_WIDTH_KEYS)[number], number>;

/** Slot holding the entity name (the title band). */
export const ER_ENTITY_NAME_TEXT_SLOT_ID = "name";

/** The three texts of a column, in the order their slots are keyed (and Tab walks them). */
export const ER_ENTITY_COLUMN_FIELDS = ["key", "name", "type"] as const;

/** One of the three texts of a column (see ER_ENTITY_COLUMN_FIELDS). */
export type ErEntityColumnField = (typeof ER_ENTITY_COLUMN_FIELDS)[number];

/**
 * Height one row occupies, in local px: the line box of the row's type size
 * plus the shared text box's vertical padding, so a row's text box fits the row
 * exactly (the table cell's metric).
 *
 * @param fontSize - The row's type size in px: the largest its three texts resolve to
 * @returns `fontSize` times the shared line height plus 4, 25 at the default 14
 */
export const calcErEntityRowHeight = (fontSize: number): number =>
	fontSize * TEXT_LINE_HEIGHT + TEXT_BOX_PADDING_Y * 2;

/**
 * What every slot's omitted typography resolves to last: the values the column
 * texts share (left-aligned, top-packed so an overlong text clips after its first
 * line). Declared as `everyTextSlot` because the column slots are as many as the
 * entity has columns, so there is no fixed set of ids to key them by; the title
 * and the keys have a role of their own instead
 * (readErEntityTextSlotStyleDefaults).
 */
export const ER_ENTITY_TEXT_SLOT_STYLE_DEFAULTS = {
	textAlign: "left",
	verticalAlign: "top",
	fontColor: AUTO_COLOR,
	fontSize: ER_ENTITY_FONT_SIZE,
	fontWeight: "normal",
} as const satisfies TextSlotStyle;

/**
 * Theme-derived doc defaults for a newly created entity: untitled and without
 * columns (the stencil supplies the sample ones). Typography is left out so a
 * fresh document carries none, every slot resolving the shared defaults.
 */
export const ER_ENTITY_DOC_DEFAULTS: Omit<ErEntityDoc, "id"> = {
	type: ErEntityFeatures.type,
	x: 0,
	y: 0,
	nameWidth: ER_ENTITY_DEFAULT_NAME_WIDTH,
	typeWidth: ER_ENTITY_DEFAULT_TYPE_WIDTH,
	name: "",
	// Typed rather than left to `as const`, which would make it a readonly tuple
	// that no longer overlaps the doc's array (as in TableDoc).
	columns: [] as ErEntityColumnDoc[],
	fill: AUTO_COLOR,
	stroke: AUTO_COLOR,
	strokeWidth: DEFAULT_STROKE_WIDTH,
} as const as ErEntityDoc;
