import type {
	CreateObjectType,
	ObjectFeatures,
	RichText,
	TextSlot,
} from "@jiscribe/canvas/doc";
import {
	AUTO_COLOR,
	DEFAULT_FONT_FAMILY,
	TEXT_LINE_HEIGHT,
} from "@jiscribe/canvas-sdk/doc";

/** Slot holding the box stereotype (<<interface>> / <<abstract>>). */
export const RECORD_STEREOTYPE_SLOT_ID = "stereotype";

/** Slot holding the box title (class / entity / concept name). */
export const RECORD_NAME_SLOT_ID = "name";

/** Slot holding the attribute rows (fields, properties, ER columns). */
export const RECORD_ATTRIBUTES_SLOT_ID = "attributes";

/** Slot holding the operation rows (methods, behaviors). */
export const RECORD_OPERATIONS_SLOT_ID = "operations";

/**
 * Every slot a record may hold, in the order their compartments stack from the
 * top of the box. `name` is always there; the others are optional, and an absent
 * one is not an empty compartment but no compartment at all — which is how a
 * stereotyped interface, a two-compartment DTO and a name-only box are written
 * from the one slot set.
 */
export const RECORD_SLOT_IDS = [
	RECORD_STEREOTYPE_SLOT_ID,
	RECORD_NAME_SLOT_ID,
	RECORD_ATTRIBUTES_SLOT_ID,
	RECORD_OPERATIONS_SLOT_ID,
] as const;

/** One of the record's slot ids (see RECORD_SLOT_IDS). */
export type RecordSlotId = (typeof RECORD_SLOT_IDS)[number];

/**
 * The slots whose content is a list of rows rather than one string. Splits the
 * slot set the way the validators and the mapper need it: the slots left out here
 * (stereotype, name) are the text bands at the top of the box.
 */
export const RECORD_LIST_SLOT_IDS = [
	RECORD_ATTRIBUTES_SLOT_ID,
	RECORD_OPERATIONS_SLOT_ID,
] as const;

/** One of the row-holding slot ids (see RECORD_LIST_SLOT_IDS). */
export type RecordListSlotId = (typeof RECORD_LIST_SLOT_IDS)[number];

/**
 * Whether a key names a slot of the record. Takes any string so a key read off an
 * untrusted document or state can be tested against the closed set.
 *
 * @param value - Any key; only the ids in RECORD_SLOT_IDS match
 */
export const isRecordSlotId = (value: string): value is RecordSlotId =>
	(RECORD_SLOT_IDS as readonly string[]).includes(value);

/**
 * Whether a key names a row-holding slot, i.e. a compartment rather than one of
 * the text bands at the top. The one place that split is read from.
 *
 * @param value - Any key; a band's id, and a key that is no slot at all, return false
 */
export const isRecordListSlotId = (value: string): value is RecordListSlotId =>
	(RECORD_LIST_SLOT_IDS as readonly string[]).includes(value);

/** Default type size; the band metrics below are derived from it. */
export const RECORD_FONT_SIZE = 14;

/**
 * Height one drawn row occupies at the default type size, in local pixels.
 * Derived from the shared line-height; a compartment whose slot raises
 * `fontSize` is measured from that size instead (see calcRecordListHeight).
 */
export const RECORD_ROW_HEIGHT = RECORD_FONT_SIZE * TEXT_LINE_HEIGHT;

/**
 * Vertical padding the shared text box (TextOverlayFrame's content element) adds
 * above and below a list compartment's rows. Counted in below so a compartment
 * sized for its rows shows them without clipping.
 */
export const RECORD_LIST_PADDING_Y = 2;

/**
 * Horizontal padding the shared text box adds on each side of a band's text, i.e.
 * the width the text has to wrap in is the box width minus twice this
 * (see TextOverlayFrame's content element).
 */
export const RECORD_BAND_PADDING_X = 6;

/**
 * Local pixels a text band adds above and below its text in total: the shared
 * text box's own vertical padding plus the band's extra breathing room.
 */
export const RECORD_BAND_PADDING_Y_TOTAL = 7;

/**
 * Height of one text band (the stereotype, the title) holding one line at the
 * default type size. A band follows its slot — a larger `fontSize`, a newline, or
 * text too long for the width grows it (see calcRecordSlotRegions) — so this is
 * the height a freshly created record shows, and the unit a stencil's height sums
 * one term of per band it starts with.
 */
export const RECORD_BAND_HEIGHT =
	RECORD_ROW_HEIGHT + RECORD_BAND_PADDING_Y_TOTAL;

/**
 * Height a list compartment showing `rowCount` rows occupies, padding included.
 * The single place the rows → pixels conversion lives: the region split measures
 * a compartment with it, and the doc defaults size a fresh box with it.
 *
 * @param rowCount - Rows to fit; 0 still yields one row's worth, so an empty
 *   compartment reads as a compartment rather than a hairline
 * @param fontSize - Type size the rows are drawn at, in local pixels; defaults
 *   to {@link RECORD_FONT_SIZE}, so callers sizing a fresh box can omit it
 * @returns Local pixels, never below one row plus the padding
 */
export const calcRecordListHeight = (
	rowCount: number,
	fontSize: number = RECORD_FONT_SIZE,
): number =>
	Math.max(rowCount, 1) * fontSize * TEXT_LINE_HEIGHT +
	RECORD_LIST_PADDING_Y * 2;

/**
 * The typography every record slot starts from: color, size and family, plus the
 * placement the rows compartments keep as is — they are the bulk of the box, so
 * the shared values are theirs (left, packed to the top). The two text bands at
 * the top override the placement below; which slot gets which is
 * RECORD_SLOT_STYLE_DEFAULTS_BY_ID.
 */
export const RECORD_SLOT_STYLE_DEFAULTS = {
	textAlign: "left",
	verticalAlign: "top",
	fontColor: AUTO_COLOR,
	fontSize: RECORD_FONT_SIZE,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const satisfies Omit<TextSlot, "text">;

/**
 * What each slot's omitted typography is filled from, keyed by slot id. The one
 * place the per-slot look is decided — the mapper fills a parsed doc from it, the
 * doc defaults spell a fresh record out with it, and the region split measures a
 * band with it — so a record written as `{"name":{"text":"User"}}` renders like
 * one dropped from the toolbar.
 */
export const RECORD_SLOT_STYLE_DEFAULTS_BY_ID = {
	/** Centered over the title, and left at the body weight so the `<<interface>>` line reads as the title's caption rather than a second title. */
	[RECORD_STEREOTYPE_SLOT_ID]: {
		...RECORD_SLOT_STYLE_DEFAULTS,
		textAlign: "center",
		verticalAlign: "middle",
	},
	/** Centered and bold, as UML draws a type name. */
	[RECORD_NAME_SLOT_ID]: {
		...RECORD_SLOT_STYLE_DEFAULTS,
		textAlign: "center",
		verticalAlign: "middle",
		fontWeight: "bold",
	},
	/** The shared values as they are: the compartments are what they were chosen for. */
	[RECORD_ATTRIBUTES_SLOT_ID]: RECORD_SLOT_STYLE_DEFAULTS,
	/** The shared values as they are, the attribute compartment's twin. */
	[RECORD_OPERATIONS_SLOT_ID]: RECORD_SLOT_STYLE_DEFAULTS,
} as const satisfies Record<RecordSlotId, Omit<TextSlot, "text">>;

/**
 * A record: a titled box, optionally captioned with a stereotype, over one or two
 * compartments of rows (a UML class or interface, an ER entity, an ontology
 * concept with its properties). Its text is a set of slots keyed by slot id
 * (see RECORD_SLOT_IDS) rather than the single body other shapes take; the string
 * form is not valid here (see validateRecordDoc).
 *
 * Adopts rect geometry (x/y/width/height) so it reuses Frame-based transforms and
 * outline connector attachment exactly like Rect / Card. The box is sized freely:
 * a height too small for the rows clips them rather than growing the box.
 */
export const RecordFeatures = {
	type: "record",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "slots",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * The record's `text`: a closed set of slot ids, unlike the single body of most
 * shapes. Which of them are written decides how many compartments the box has,
 * so the optional keys are the shape's structure and not merely absent content.
 * Each slot carries its own typography (TextSlot), there being no shape-wide
 * text style to inherit from.
 */
export type RecordTextDoc = {
	/** Stereotype line above the title (`<<interface>>`, `<<enum>>`). Omitted means the box shows none; written, it gets a band of its own, undivided from the title's. */
	stereotype?: TextSlot<RichText>;
	/** Title shown in the top band. Always present; may be empty. */
	name: TextSlot<RichText>;
	/** Attribute rows, one entry per line. Omitted means the box has no attribute compartment. */
	attributes?: TextSlot<RichText[]>;
	/** Operation rows, one entry per line. Omitted means the box has no operation compartment. */
	operations?: TextSlot<RichText[]>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const RecordDocBrand: unique symbol;

/**
 * `text: "slots"` mixes in no text fields of its own, so the closed slot set is
 * spelled out here — the one place that knows which slots a record may have.
 */
export type RecordDoc = CreateObjectType<
	typeof RecordFeatures,
	typeof RecordDocBrand,
	{
		/** The text slots. Absent is read as a title-only box with an empty title. */
		text?: RecordTextDoc;
	}
>;

/**
 * Theme-derived doc defaults for a newly created record (tier 2: AUTO_COLOR /
 * DEFAULT_FONT_FAMILY). A title over one compartment — the shape most records
 * take — with the operations compartment and the stereotype band reached through
 * the stencils (see RecordStencils). The typography is spelled out per slot
 * because a slot is where it is stored: the drawing has no styling of its own
 * (RecordBox).
 */
export const RECORD_DOC_DEFAULTS: Omit<RecordDoc, "id"> = {
	type: "record",
	x: 0,
	y: 0,
	width: 180,
	// Fits three attribute rows under the title band without resizing.
	height: RECORD_BAND_HEIGHT + calcRecordListHeight(3),
	fill: AUTO_COLOR,
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: {
		name: { text: "", ...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.name },
		// `as RichText[]` keeps `as const` from typing the empty rows as a readonly
		// tuple, which no longer overlaps RecordTextDoc.
		attributes: {
			text: [] as RichText[],
			...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.attributes,
		},
	},
} as const as RecordDoc;
