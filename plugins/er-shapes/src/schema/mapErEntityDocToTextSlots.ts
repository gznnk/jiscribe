import { isRichText, normalizeRichText } from "@jiscribe/doc";
import type { RichText, TextSlot } from "@jiscribe/doc";

import { erEntityColumnTextSlotId } from "./erEntityColumnIds";
import { ER_ENTITY_NAME_TEXT_SLOT_ID } from "./ErEntityDoc";
import type { ErEntityColumnDoc, ErEntityTextDoc } from "./ErEntityDoc";

/**
 * One text in the form the state holds it: the slot object, its text in
 * canonical form. Typography is left as written — an omitted field is resolved
 * per read (resolveErEntityTextSlotStyle), so materializing it here would put it
 * into a document that never wrote it.
 */
const normalizeErEntityText = (
	value: ErEntityTextDoc | undefined,
): TextSlot<RichText> => {
	if (value === undefined) {
		return { text: "" };
	}
	if (isRichText(value)) {
		return { text: normalizeRichText(value) };
	}
	return { ...value, text: normalizeRichText(value.text) };
};

/**
 * The texts of an entity document as the keyed slot map the text machinery
 * reads, in erEntityTextSlotIds order, every column holding all three slots.
 *
 * @param doc - The title and the columns as the document writes them; a `columns` that is not an array (an untyped doc a size calculator hands over) reads as none, for the validator to report
 * @returns A fresh map holding each text's own typography alone
 */
export const mapErEntityDocToTextSlots = (doc: {
	name?: ErEntityTextDoc;
	columns?: readonly ErEntityColumnDoc[];
}): Record<string, TextSlot<RichText>> => {
	const slots: Record<string, TextSlot<RichText>> = {
		[ER_ENTITY_NAME_TEXT_SLOT_ID]: normalizeErEntityText(doc.name),
	};
	const columns = Array.isArray(doc.columns) ? doc.columns : [];
	columns.forEach((column, columnIndex) => {
		slots[erEntityColumnTextSlotId(columnIndex, "key")] = normalizeErEntityText(
			column.key,
		);
		slots[erEntityColumnTextSlotId(columnIndex, "name")] =
			normalizeErEntityText(column.name);
		slots[erEntityColumnTextSlotId(columnIndex, "type")] =
			normalizeErEntityText(column.type);
	});
	return slots;
};
