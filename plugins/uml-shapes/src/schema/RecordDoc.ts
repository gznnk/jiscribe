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

/** Slot holding the compartment rows (attributes, fields, properties). */
export const RECORD_ROWS_SLOT_ID = "rows";

/** Default type size; the band metrics below are derived from it. */
export const RECORD_FONT_SIZE = 14;

/**
 * Height one drawn row occupies, in local pixels. Derived from the shared
 * line-height, and the unit the default box height is measured in (a row that
 * wraps takes more than this and overflows — see calcRecordSlotRegions).
 */
export const RECORD_ROW_HEIGHT = RECORD_FONT_SIZE * TEXT_LINE_HEIGHT;

/** Height of the title band: one line of text plus breathing room above and below. */
export const RECORD_HEADER_HEIGHT = 28;

/**
 * Vertical padding the shared text box (TextOverlayFrame's content element) adds
 * above and below the rows. Counted in below so the default height shows its rows
 * without clipping them.
 */
const RECORD_ROWS_PADDING_Y = 2;

/** Local pixels of the box the rows cannot use: the title band plus the text box's own padding. */
export const RECORD_ROWS_RESERVED_HEIGHT =
	RECORD_HEADER_HEIGHT + RECORD_ROWS_PADDING_Y * 2;

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
 * A record: a titled box with a compartment of rows below it (a UML class, an ER
 * entity, an ontology concept with its properties). Two text slots — `name` for
 * the title band and `rows` for the compartment — keyed by slot id in `text`;
 * the single-body form other shapes use is not valid here (see validateRecordDoc).
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
 * shapes. The variability lives in the `rows` array, so the key set stays fixed
 * and doubles as the slot declaration. Each slot carries its own typography
 * (TextSlot), there being no shape-wide text style to inherit from.
 */
export type RecordTextDoc = {
	/** Title shown in the top band. May be empty. */
	name: TextSlot<string>;
	/** Compartment rows, one entry per line. May be empty; an entry may not contain a newline. */
	rows: TextSlot<string[]>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const RecordDocBrand: unique symbol;

/**
 * `text: "slots"` mixes in no text fields of its own, so the closed slot set is
 * spelled out here — the one place that knows a record has exactly `name` and `rows`.
 */
export type RecordDoc = CreateObjectType<
	typeof RecordFeatures,
	typeof RecordDocBrand,
	{
		/** The two text slots. Absent is read as both empty. */
		text?: RecordTextDoc;
	}
>;

/**
 * Theme-derived doc defaults for a newly created record (tier 2: AUTO_COLOR /
 * DEFAULT_FONT_FAMILY). The typography is repeated in both slots because a slot
 * is where it is stored — the drawing has no styling of its own (RecordBox).
 */
export const RECORD_DOC_DEFAULTS: Omit<RecordDoc, "id"> = {
	type: "record",
	x: 0,
	y: 0,
	width: 180,
	// Fits three rows under the title band without resizing.
	height: RECORD_ROWS_RESERVED_HEIGHT + 3 * RECORD_ROW_HEIGHT,
	fill: AUTO_COLOR,
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: {
		name: { text: "", ...RECORD_SLOT_STYLE_DEFAULTS },
		// `as string[]` keeps `as const` from typing the empty rows as a readonly
		// tuple, which no longer overlaps RecordTextDoc.
		rows: { text: [] as string[], ...RECORD_SLOT_STYLE_DEFAULTS },
	},
} as const as RecordDoc;
