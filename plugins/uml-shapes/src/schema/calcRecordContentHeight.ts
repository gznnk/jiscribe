// How tall each of a record's compartments asks to be, measured from its own text.
// Headless, so the drawing (calcRecordTextSlotRegions) and the document side — the
// AI tool fitting the box, the overflow check (diagnoseRecordOverflow) — measure a
// compartment with the same rule.

import type { TextMeasureFont } from "@jiscribe/canvas-sdk/doc";
import {
	calcVisualTextHeight,
	TEXT_LINE_HEIGHT,
} from "@jiscribe/canvas-sdk/doc";
import { isRichText, isTextRows } from "@jiscribe/doc";
import type { RichText, TextSlot } from "@jiscribe/doc";

import {
	RECORD_BAND_PADDING_X,
	RECORD_BAND_PADDING_Y_TOTAL,
	RECORD_LIST_PADDING_Y,
	RECORD_NAME_TEXT_SLOT_ID,
	RECORD_TEXT_SLOT_IDS,
	RECORD_TEXT_SLOT_STYLE_DEFAULTS_BY_ID,
} from "./RecordDoc";
import type { RecordTextSlotId } from "./RecordDoc";

/**
 * What the measurement reads off a record, doc or state alike: the untransformed
 * width the bands wrap in, and the slots. Typed as the open slot map every
 * text-bearing state carries rather than the record's own set, so the canvas's
 * region calculator type still accepts the state it is handed.
 */
export type RecordTextSlotsContent = {
	/** Untransformed box width in local pixels; the bands wrap in it less their padding. */
	width: number;
	/** The shape's text slots, keyed by slot id; absent is read as a title-only box with an empty title. */
	text?: Record<string, TextSlot>;
};

/** The font a slot is drawn with: its own, falling back to that slot id's defaults. */
const textSlotFont = (
	slotId: RecordTextSlotId,
	slot: TextSlot | undefined,
): TextMeasureFont => {
	const styleDefaults = RECORD_TEXT_SLOT_STYLE_DEFAULTS_BY_ID[slotId];
	return {
		fontSize: slot?.fontSize ?? styleDefaults.fontSize,
		fontFamily: slot?.fontFamily ?? styleDefaults.fontFamily,
		fontWeight: slot?.fontWeight ?? styleDefaults.fontWeight,
		fontStyle: slot?.fontStyle,
	};
};

/**
 * Height a text band (the stereotype, the title) needs for its slot: every line
 * the text occupies once wrapped in the box width, plus the padding around it.
 * Follows the slot's own typography, falling back to that slot id's defaults, so
 * raising `fontSize` or writing a title too long for the width grows the band
 * instead of clipping it.
 */
const calcBandHeight = (
	width: number,
	slotId: RecordTextSlotId,
	slot: TextSlot | undefined,
): number => {
	const text = isRichText(slot?.text) ? slot.text : "";
	return (
		calcVisualTextHeight(
			text,
			textSlotFont(slotId, slot),
			width - RECORD_BAND_PADDING_X * 2,
		) + RECORD_BAND_PADDING_Y_TOTAL
	);
};

/**
 * Height a compartment needs for its rows: each row's own line box, so a row
 * holding a part drawn larger takes the room it draws in. Rows are measured as
 * authored — a row too long for the width wraps and overflows rather than
 * widening the compartment's share — and an empty compartment still keeps one
 * row's worth.
 */
const calcListHeight = (
	slotId: RecordTextSlotId,
	rows: readonly RichText[],
	slot: TextSlot | undefined,
): number => {
	const font = textSlotFont(slotId, slot);
	const rowsHeight = rows.reduce(
		(total, row) => total + calcVisualTextHeight(row, font),
		0,
	);
	return (
		Math.max(rowsHeight, font.fontSize * TEXT_LINE_HEIGHT) +
		RECORD_LIST_PADDING_Y * 2
	);
};

/**
 * Height one slot's compartment asks for. A text band is measured from its
 * wrapped lines; a compartment from its rows and its own `fontSize`.
 *
 * @param width - Untransformed box width in local pixels; only a band wraps in it
 * @param slotId - Which slot, deciding the typography an unset field falls back to
 * @param slot - The slot as written; undefined measures an empty band
 * @returns Local pixels, never below one line plus the compartment's padding
 */
export const calcRecordTextSlotHeight = (
	width: number,
	slotId: RecordTextSlotId,
	slot: TextSlot | undefined,
): number => {
	const content = slot?.text;
	return isTextRows(content)
		? calcListHeight(slotId, content, slot)
		: calcBandHeight(width, slotId, slot);
};

/**
 * The compartments a record has, top to bottom: `name` always, every other slot
 * only where the slots hold it.
 *
 * @param text - The slots; undefined is a title-only box
 * @returns Slot ids in RECORD_TEXT_SLOT_IDS order, never empty
 */
export const listRecordPresentTextSlotIds = (
	text: Record<string, TextSlot> | undefined,
): RecordTextSlotId[] =>
	RECORD_TEXT_SLOT_IDS.filter(
		(slotId) =>
			slotId === RECORD_NAME_TEXT_SLOT_ID || text?.[slotId] !== undefined,
	);

/**
 * Height a record has to be for every compartment, the bottom one included, to
 * show all of its content: the sum of what each compartment asks for. The box
 * does not follow its content (calcRecordTextSlotRegions hands the bottom
 * compartment whatever is left), so a stored height below this draws the last
 * rows past the box.
 *
 * @param record - The untransformed width and the slots, read off a doc or a state alike
 * @returns Local pixels; a title-only box with an empty title still gets one band's worth
 */
export const calcRecordContentHeight = (
	record: RecordTextSlotsContent,
): number =>
	listRecordPresentTextSlotIds(record.text).reduce(
		(total, slotId) =>
			total +
			calcRecordTextSlotHeight(record.width, slotId, record.text?.[slotId]),
		0,
	);
