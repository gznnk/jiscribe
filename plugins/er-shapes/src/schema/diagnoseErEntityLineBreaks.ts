import { richTextToPlain } from "@jiscribe/doc";
import type { ObjectDocOverflowDiagnoser, TextSlotStyle } from "@jiscribe/doc";

import { erEntityColumnTextSlotId } from "./erEntityColumnIds";
import {
	ER_ENTITY_COLUMN_FIELDS,
	ER_ENTITY_TEXT_SLOT_STYLE_DEFAULTS,
} from "./ErEntityDoc";
import type { ErEntityColumnDoc } from "./ErEntityDoc";
import { resolveErEntityTextSlotStyle } from "./erEntityTextSlotStyle";
import { mapErEntityDocToTextSlots } from "./mapErEntityDocToTextSlots";

const LINE_BREAK_PATTERN = /[\r\n]/;

/**
 * Which lines the one-line row keeps, by where the slot packs its text: the
 * slot clips what overflows it on the side its alignment pushes the text off.
 */
const CLIPPED_LINES_BY_VERTICAL_ALIGN: Record<
	NonNullable<TextSlotStyle["verticalAlign"]>,
	string
> = {
	top: "the text after the line break is clipped and not drawn",
	middle: "its lines are cut at the row's top and bottom edges",
	bottom: "the text before the line break is clipped and not drawn",
};

/**
 * The findings about column texts holding a line break, empty when none does. A
 * column's key, name and type are one row tall (calcErEntityRowHeight) whatever
 * they hold, so a second line has nowhere to go and is clipped by the slot. The
 * editor refuses a line break there, but a file or a tool may still write one.
 * The title is not checked: its band is sized from its text (calcErEntityLayout).
 *
 * @param doc - A parsed entity doc; a `columns` that is not an array is passed over. `\r` counts as a line break as well as `\n`
 * @returns One message per text holding a line break, in column order and key, name, type within a column
 */
export const diagnoseErEntityLineBreaks: ObjectDocOverflowDiagnoser = (doc) => {
	const { columns } = doc as { columns?: unknown };
	if (!Array.isArray(columns)) {
		return [];
	}
	// Parse-time validation (validateErEntityFields) has settled each column's shape.
	const columnDocs = columns as readonly ErEntityColumnDoc[];
	const slots = mapErEntityDocToTextSlots({ columns: columnDocs });
	const messages: string[] = [];
	columnDocs.forEach((_column, columnIndex) => {
		const nameText = richTextToPlain(
			slots[erEntityColumnTextSlotId(columnIndex, "name")].text,
		);
		for (const field of ER_ENTITY_COLUMN_FIELDS) {
			const slotId = erEntityColumnTextSlotId(columnIndex, field);
			if (!LINE_BREAK_PATTERN.test(richTextToPlain(slots[slotId].text))) {
				continue;
			}
			const columnNote =
				field === "name" ? "" : ` (of column ${JSON.stringify(nameText)})`;
			const verticalAlign =
				resolveErEntityTextSlotStyle({ text: slots }, slotId).verticalAlign ??
				ER_ENTITY_TEXT_SLOT_STYLE_DEFAULTS.verticalAlign;
			messages.push(
				`line break in column ${columnIndex} ${field}${columnNote}: a column's key, name and type are one line tall, so ${CLIPPED_LINES_BY_VERTICAL_ALIGN[verticalAlign]}; rewrite it on one line with er_entity_set_texts`,
			);
		}
	});
	return messages;
};
