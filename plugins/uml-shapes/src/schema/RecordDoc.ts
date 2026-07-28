import type {
	CreateObjectType,
	ObjectFeatures,
	TextSlot,
} from "@workspace/canvas/doc";
import {
	AUTO_COLOR,
	DEFAULT_FONT_FAMILY,
	TEXT_LINE_HEIGHT,
} from "@workspace/canvas/unstable-doc";

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
 * two-compartment box (a DTO, an ER entity) and a name-only box are written.
 */
export const RECORD_SLOT_IDS = [
	RECORD_NAME_SLOT_ID,
	RECORD_ATTRIBUTES_SLOT_ID,
	RECORD_OPERATIONS_SLOT_ID,
] as const;

/** One of the record's slot ids (RECORD_SLOT_IDS 参照). */
export type RecordSlotId = (typeof RECORD_SLOT_IDS)[number];

/**
 * A slot whose content is a list of rows — every slot but the title, and equally
 * every slot a record may leave out.
 */
export type RecordListSlotId = Exclude<
	RecordSlotId,
	typeof RECORD_NAME_SLOT_ID
>;

/** Default type size; the band metrics below are derived from it. */
export const RECORD_FONT_SIZE = 14;

/**
 * Height one drawn row occupies, in local pixels. Derived from the shared
 * line-height, and the unit a list compartment is measured in (a row that wraps
 * takes more than this and overflows — see calcRecordSlotRegions).
 */
export const RECORD_ROW_HEIGHT = RECORD_FONT_SIZE * TEXT_LINE_HEIGHT;

/**
 * Vertical padding the shared text box (TextOverlayFrame's content element) adds
 * above and below a list compartment's rows. Counted in below so a compartment
 * sized for its rows shows them without clipping.
 */
const RECORD_LIST_PADDING_Y = 2;

/**
 * Horizontal padding the shared text box adds on each side of the title, i.e.
 * the width the name has to wrap in is the box width minus twice this
 * (TextOverlayFrame's content element 参照).
 */
export const RECORD_NAME_PADDING_X = 6;

/**
 * Local pixels the title band adds above and below its text in total: the shared
 * text box's own vertical padding plus the band's extra breathing room.
 */
export const RECORD_NAME_PADDING_Y_TOTAL = 7;

/**
 * Height of the title band holding one line at the default type size. The band
 * itself follows its slot — a larger `fontSize`, a newline, or a title too long
 * for the width grows it (calcRecordSlotRegions 参照) — so this is the height a
 * freshly created record shows, and the unit the default box height reserves.
 */
export const RECORD_HEADER_HEIGHT =
	RECORD_ROW_HEIGHT + RECORD_NAME_PADDING_Y_TOTAL;

/**
 * Height a list compartment showing `rowCount` rows occupies, padding included.
 * The single place the rows → pixels conversion lives: the region split measures
 * a compartment with it, and the doc defaults size a fresh box with it.
 *
 * @param rowCount - Rows to fit; 0 still yields one row's worth, so an empty
 *   compartment reads as a compartment rather than a hairline
 * @returns Local pixels, never below one row plus the padding
 */
export const calcRecordListHeight = (rowCount: number): number =>
	Math.max(rowCount, 1) * RECORD_ROW_HEIGHT + RECORD_LIST_PADDING_Y * 2;

/**
 * Typography a record slot has unless its doc says otherwise: the mapper fills
 * omitted fields from here (the "Default:" values the schema documents), and a
 * fresh record starts with them spelled out. The rows are the bulk of the box,
 * so these are their values — left, packed to the top — and the title band
 * takes them too rather than leaving one slot unstyled.
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
 * A record: a titled box with one or two compartments of rows below it (a UML
 * class, an ER entity, an ontology concept with its properties). Its text is a
 * set of slots keyed by slot id (RECORD_SLOT_IDS 参照) rather than the single
 * body other shapes take; the string form is not valid here (validateRecordDoc 参照).
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
	/** Title shown in the top band. Always present; may be empty. */
	name: TextSlot<string>;
	/** Attribute rows, one entry per line. Omitted means the box has no attribute compartment. */
	attributes?: TextSlot<string[]>;
	/** Operation rows, one entry per line. Omitted means the box has no operation compartment. */
	operations?: TextSlot<string[]>;
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
 * DEFAULT_FONT_FAMILY). Two compartments — the shape most records take — with the
 * third available through the class stencil (RecordStencils 参照). The typography
 * is repeated in both slots because a slot is where it is stored: the drawing has
 * no styling of its own (RecordBox).
 */
export const RECORD_DOC_DEFAULTS: Omit<RecordDoc, "id"> = {
	type: "record",
	x: 0,
	y: 0,
	width: 180,
	// Fits three attribute rows under the title band without resizing.
	height: RECORD_HEADER_HEIGHT + calcRecordListHeight(3),
	fill: AUTO_COLOR,
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: {
		name: { text: "", ...RECORD_SLOT_STYLE_DEFAULTS },
		// `as string[]` keeps `as const` from typing the empty rows as a readonly
		// tuple, which no longer overlaps RecordTextDoc.
		attributes: { text: [] as string[], ...RECORD_SLOT_STYLE_DEFAULTS },
	},
} as const as RecordDoc;
