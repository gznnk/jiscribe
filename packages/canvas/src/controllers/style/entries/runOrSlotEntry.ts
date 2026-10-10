import { isString } from "@jiscribe/basic-validators";
import type { InlineTextStyle } from "@jiscribe/doc/model/objects/types/text/InlineTextStyle";
import {
	clearInlineStyleFromRuns,
	sliceRichText,
	styleRichTextRange,
} from "@jiscribe/doc/model/objects/types/text/RichText";
import { isTextRows } from "@jiscribe/doc/model/objects/types/text/TextSlot";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { writeRichTextSlot } from "../../../states/objects/types/TextSlots";
import type { StyleEntry } from "../StyleEntry";
import type {
	StyleIntentValueType,
	TextSlotStyleIntentKind,
} from "../StyleIntent";
import type { SlotsOf } from "./slotEntry";
import { slotEntry } from "./slotEntry";
import { readRangeEdit } from "./utils/readRangeEdit";

/**
 * An intent stored on the text slots that a stretch of characters may also carry
 * on its own (the inline half of a slot's typography): a color, a size, a weight.
 * Where it lands depends on what the edit means.
 *
 * With a stretch of an open editor's text selected, it lands on those characters
 * alone — which is what makes the text menus style a selection rather than the
 * whole shape. Otherwise it lands on the whole slot, and the runs that overrode
 * the field are stripped of it: a value set on the whole text has to win over the
 * stretches it was set on part of it, or the slot would change and nothing would
 * look different. The doc-ops apply the same rule (applyStyle).
 *
 * @param field - The inline field written and read; its name is the intent's, and fixes the value type (StyleIntentValueType)
 * @param options - `slotsOf`: which slots the whole-slot write lands on (defaultSlotsOf for the core types)
 * @returns The pair, following `ctx.textEditRange` when it names the object at hand
 * @template TState - The state the entry is written against
 * @template K - The field, which decides the value type
 */
export const runOrSlotEntry = <
	TState extends ObjectState,
	K extends TextSlotStyleIntentKind & keyof InlineTextStyle,
>(
	field: K,
	{ slotsOf }: { slotsOf: SlotsOf<TState> },
): StyleEntry<TState, StyleIntentValueType<K>> => {
	type V = StyleIntentValueType<K>;
	const wholeSlot = slotEntry<TState, V>(field, slotsOf, (slot, value) => {
		const inlineKeys = [field];
		// A row-partitioned slot is stripped row by row, each row being a body of
		// its own.
		const content = isTextRows(slot.text)
			? slot.text.map((row) => clearInlineStyleFromRuns(row, inlineKeys))
			: clearInlineStyleFromRuns(slot.text, inlineKeys);
		return { ...slot, text: content, [field]: value };
	});

	return {
		apply: (object, pick, value, ctx) => {
			const range = readRangeEdit(object, ctx);
			if (range === null) {
				return wholeSlot.apply(object, pick, value, ctx);
			}
			// The row boundaries the stretch may reach over are the slot's, not the
			// text's: it is styled as the one body its rows read as and split back by
			// the writer the commit also uses (writeRichTextSlot).
			const styled = styleRichTextRange(range.content, range.start, range.end, {
				[field]: value,
			});
			return {
				...object,
				text: writeRichTextSlot(range.slots, range.slotId, styled),
			} as TState;
		},
		read: (object, pick, ctx) => {
			const range = readRangeEdit(object, ctx);
			if (range === null) {
				return wholeSlot.read(object, pick, ctx);
			}
			const base = ctx.textStyleDefaults.resolveSlotStyle(
				object.type,
				range.slotId,
				range.slots[range.slotId],
			);
			const covered = sliceRichText(range.content, range.start, range.end);
			// One value per run the stretch covers, so a stretch styled in two colors
			// reports both rather than reporting neither (the reader folds them into
			// `mixed`). An unstyled stretch cuts to a plain string and reads as the
			// slot's own value, which is what its characters are drawn with.
			return isString(covered)
				? [base[field] as V]
				: covered.map((run) => (run[field] ?? base[field]) as V);
		},
	};
};
