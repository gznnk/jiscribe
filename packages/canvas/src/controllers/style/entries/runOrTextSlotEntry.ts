import { isString } from "@jiscribe/basic-validators";
import type { InlineTextStyle } from "@jiscribe/doc/model/objects/types/text/InlineTextStyle";
import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import {
	clearInlineStyleFromRuns,
	sliceRichText,
	styleRichTextRange,
} from "@jiscribe/doc/model/objects/types/text/RichText";
import { isTextRows } from "@jiscribe/doc/model/objects/types/text/TextSlot";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { writeRichTextSlot } from "../../../states/objects/types/TextSlots";
import type { StyleContext, StyleEntry } from "../StyleEntry";
import type {
	StyleIntentValueType,
	TextSlotStyleIntentKind,
} from "../StyleIntent";
import { textSlotEntry } from "./textSlotEntry";
import type { RangeEdit } from "./utils/readRangeEdit";
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
 * A write of the value the text is drawn with already returns the object it was
 * handed (StyleEntry.apply's same-reference contract), so a pick of the color
 * shown commits nothing. "Drawn with" is what `read` reports — the slot's own
 * field over its type's defaults, a run's own field over the slot's — so a slot
 * leaving the field to its defaults is not written for that default, which
 * would only pin it into the document, and a stretch inheriting the slot's value
 * is not given a run of its own, which no later whole-slot write would keep. A
 * whole-slot write still lands where a run overrides the field, however the slot
 * reads: the strip is the change.
 *
 * @param field - The inline field written and read; its name is the intent's, and fixes the value type (StyleIntentValueType)
 * @returns The pair, following `ctx.textEditRange` when it names the object at hand, and writing the slots the pick reaches (resolveTextSlotIds) otherwise; `object` itself where every place the write would land is drawn with the value already
 * @template TState - The state the entry is written against
 * @template K - The field, which decides the value type
 */
export const runOrTextSlotEntry = <
	TState extends ObjectState,
	K extends TextSlotStyleIntentKind & keyof InlineTextStyle,
>(
	field: K,
): StyleEntry<TState, StyleIntentValueType<K>> => {
	type V = StyleIntentValueType<K>;
	/** Whether a run of the body carries the field itself, the one thing the strip below changes. */
	const hasRunOverride = (rich: RichText): boolean =>
		!isString(rich) && rich.some((run) => run[field] !== undefined);

	const wholeSlot = textSlotEntry<TState, V>(
		field,
		(slot, value, resolvedStyle) => {
			const isOverridden = isTextRows(slot.text)
				? slot.text.some(hasRunOverride)
				: hasRunOverride(slot.text);
			if (!isOverridden && Object.is(resolvedStyle[field], value)) {
				return slot;
			}
			const inlineKeys = [field];
			// A row-partitioned slot is stripped row by row, each row being a body of
			// its own.
			const content = isTextRows(slot.text)
				? slot.text.map((row) => clearInlineStyleFromRuns(row, inlineKeys))
				: clearInlineStyleFromRuns(slot.text, inlineKeys);
			return { ...slot, text: content, [field]: value };
		},
	);

	/**
	 * What the stretch is drawn with, one value per run it covers, so a stretch
	 * styled in two colors reports both rather than reporting neither (the reader
	 * folds them into `mixed`). An unstyled stretch cuts to a plain string and
	 * reads as the slot's own value, which is what its characters are drawn with.
	 */
	const readCoveredValues = (
		object: TState,
		range: RangeEdit,
		ctx: StyleContext,
	): V[] => {
		const base = ctx.textStyleDefaults.resolveTextSlotStyle(
			object.type,
			range.textSlotId,
			range.textSlots[range.textSlotId],
		);
		const covered = sliceRichText(range.content, range.start, range.end);
		return isString(covered)
			? [base[field] as V]
			: covered.map((run) => (run[field] ?? base[field]) as V);
	};

	return {
		apply: (object, pick, value, ctx) => {
			const range = readRangeEdit(object, ctx);
			if (range === null) {
				return wholeSlot.apply(object, pick, value, ctx);
			}
			if (
				readCoveredValues(object, range, ctx).every((drawn) =>
					Object.is(drawn, value),
				)
			) {
				return object;
			}
			// The row boundaries the stretch may reach over are the slot's, not the
			// text's: it is styled as the one body its rows read as and split back by
			// the writer the commit also uses (writeRichTextSlot).
			const styled = styleRichTextRange(range.content, range.start, range.end, {
				[field]: value,
			});
			return {
				...object,
				text: writeRichTextSlot(range.textSlots, range.textSlotId, styled),
			} as TState;
		},
		read: (object, pick, ctx) => {
			const range = readRangeEdit(object, ctx);
			if (range === null) {
				return wholeSlot.read(object, pick, ctx);
			}
			return readCoveredValues(object, range, ctx);
		},
	};
};
