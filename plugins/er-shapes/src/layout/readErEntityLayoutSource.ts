import { isNumber } from "@jiscribe/basic-validators";
import type { TextMeasureFont } from "@jiscribe/canvas-sdk/doc";
import { isTextRows } from "@jiscribe/doc";
import type { RichText, TextSlot } from "@jiscribe/doc";

import {
	countErEntityColumns,
	erEntityColumnTextSlotId,
} from "../schema/erEntityColumnIds";
import {
	ER_ENTITY_DEFAULT_NAME_WIDTH,
	ER_ENTITY_DEFAULT_TYPE_WIDTH,
	ER_ENTITY_NAME_TEXT_SLOT_ID,
} from "../schema/ErEntityDoc";
import type { ErEntityColumnDoc, ErEntityTextDoc } from "../schema/ErEntityDoc";
import { resolveErEntityTextSlotFont } from "../schema/erEntityTextSlotStyle";
import type { ErEntityTextSlots } from "../schema/erEntityTextSlotStyle";
import { mapErEntityDocToTextSlots } from "../schema/mapErEntityDocToTextSlots";

/**
 * Everything of an entity the layout reads, in the form a state holds it: the
 * stated slot widths and the slots. An ErEntityState is
 * one; the doc side builds one from the document ({@link readErEntityDocLayoutInput}).
 * The box is not part of it: the layout derives its own.
 */
export type ErEntityLayoutInput = ErEntityTextSlots & {
	/** Stated key gutter width in px; absent = sized to the widest key. */
	keyWidth?: number;
	/** Stated name column width in px; the layout draws it at least as wide as its floor. */
	nameWidth: number;
	/** Stated type column width in px; the layout draws it at least as wide as its floor. */
	typeWidth: number;
};

/** What the layout reads of one column. */
export type ErEntityColumnLayoutSource = {
	/** Key gutter text, measured for the gutter width. */
	key: RichText;
	/** The font the key is drawn in, resolved (resolveErEntityTextSlotFont). */
	keyFont: TextMeasureFont;
	/** Column name, measured for the name column's floor. */
	name: RichText;
	/** The font the name is drawn in, resolved. */
	nameFont: TextMeasureFont;
	/** Column type, measured for the type column's floor. */
	type: RichText;
	/** The font the type is drawn in, resolved. */
	typeFont: TextMeasureFont;
	/** The largest type size the column's three texts resolve to, in px: what the row pitch follows. */
	fontSize: number;
};

/**
 * Everything the entity's layout reads, each typeface already resolved, in one
 * form for both sides ({@link readErEntityTextSlotsLayoutSource}).
 */
export type ErEntityLayoutSource = {
	/** Stated key gutter width in px; absent = sized to the widest key. */
	keyWidth?: number;
	/** Name column width in px, as stated (or defaulted); the layout widens it to its floor. */
	nameWidth: number;
	/** Type column width in px, as stated (or defaulted); the layout widens it to its floor. */
	typeWidth: number;
	/** Title text. */
	name: RichText;
	/** The font the title is drawn in, resolved. */
	nameFont: TextMeasureFont;
	/** The columns in declared order. */
	columns: readonly ErEntityColumnLayoutSource[];
	/** Type size in px of the one row an entity of no columns keeps: what an unstyled column name resolves to. */
	emptyRowFontSize: number;
};

/** The fields of an entity doc the layout reads; every one optional, as a factory measures a doc it is still assembling. */
export type ErEntityDocLayoutFields = {
	/** Key gutter width in px; absent is sized to the widest key. */
	keyWidth?: number;
	/** Name column width in px; absent is ER_ENTITY_DEFAULT_NAME_WIDTH. */
	nameWidth?: number;
	/** Type column width in px; absent is ER_ENTITY_DEFAULT_TYPE_WIDTH. */
	typeWidth?: number;
	/** Title text, either form; absent reads as empty. */
	name?: ErEntityTextDoc;
	/** Columns as the doc writes them; absent reads as none. */
	columns?: readonly ErEntityColumnDoc[];
};

/**
 * The layout input of a document: its texts mapped into slots the way the state
 * holds them (mapErEntityDocToTextSlots), the stated widths read with their
 * defaults filled in. The one reading of a doc's widths, which the mapper builds
 * its state from as well.
 *
 * @param doc - An entity doc, or the defaults and overrides one is being built from; a malformed width is left to the validator and read as not stated, as a malformed `columns` is
 * @returns A fresh input holding a fresh slot map
 */
export const readErEntityDocLayoutInput = (
	doc: ErEntityDocLayoutFields,
): ErEntityLayoutInput & { text: Record<string, TextSlot<RichText>> } => ({
	...(isNumber(doc.keyWidth) && { keyWidth: doc.keyWidth }),
	nameWidth: isNumber(doc.nameWidth)
		? doc.nameWidth
		: ER_ENTITY_DEFAULT_NAME_WIDTH,
	typeWidth: isNumber(doc.typeWidth)
		? doc.typeWidth
		: ER_ENTITY_DEFAULT_TYPE_WIDTH,
	text: mapErEntityDocToTextSlots(doc),
});

/**
 * The layout source of a state: the columns read off the slots, every font
 * resolved the way the overlay draws it (resolveErEntityTextSlotFont).
 *
 * @param input - The stated slot widths plus the slots keyed by slot id; a missing slot reads as empty text
 * @returns The source
 */
export const readErEntityTextSlotsLayoutSource = (
	input: ErEntityLayoutInput,
): ErEntityLayoutSource => {
	const text: Readonly<Record<string, TextSlot>> = input.text ?? {};
	const readText = (slotId: string): RichText => {
		const content = text[slotId]?.text;
		// The rows form never reaches an entity (isValidErEntityState); read as empty if it did.
		return content === undefined || isTextRows(content) ? "" : content;
	};
	const columns: ErEntityColumnLayoutSource[] = [];
	const columnCount = countErEntityColumns(text);
	for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
		const keySlotId = erEntityColumnTextSlotId(columnIndex, "key");
		const nameSlotId = erEntityColumnTextSlotId(columnIndex, "name");
		const typeSlotId = erEntityColumnTextSlotId(columnIndex, "type");
		const keyFont = resolveErEntityTextSlotFont(input, keySlotId);
		const nameFont = resolveErEntityTextSlotFont(input, nameSlotId);
		const typeFont = resolveErEntityTextSlotFont(input, typeSlotId);
		columns.push({
			key: readText(keySlotId),
			keyFont,
			name: readText(nameSlotId),
			nameFont,
			type: readText(typeSlotId),
			typeFont,
			fontSize: Math.max(
				keyFont.fontSize,
				nameFont.fontSize,
				typeFont.fontSize,
			),
		});
	}
	return {
		...(input.keyWidth !== undefined && { keyWidth: input.keyWidth }),
		nameWidth: input.nameWidth,
		typeWidth: input.typeWidth,
		name: readText(ER_ENTITY_NAME_TEXT_SLOT_ID),
		nameFont: resolveErEntityTextSlotFont(input, ER_ENTITY_NAME_TEXT_SLOT_ID),
		columns,
		// A column the entity does not have resolves as an unstyled name.
		emptyRowFontSize: resolveErEntityTextSlotFont(
			input,
			erEntityColumnTextSlotId(columnCount, "name"),
		).fontSize,
	};
};
