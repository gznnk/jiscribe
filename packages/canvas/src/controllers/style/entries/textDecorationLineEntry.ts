import { isString } from "@jiscribe/basic-validators";
import type { InlineTextStyle } from "@jiscribe/doc/model/objects/types/text/InlineTextStyle";
import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import {
	isSameRichText,
	mapRichTextRangeStyle,
	richTextLength,
	sliceRichText,
} from "@jiscribe/doc/model/objects/types/text/RichText";
import { isTextRows } from "@jiscribe/doc/model/objects/types/text/TextSlot";

import { textSlotEntry } from "./textSlotEntry";
import { readRangeEdit } from "./utils/readRangeEdit";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { writeRichTextSlot } from "../../../states/objects/types/TextSlots";
import type { TextDecorationToken } from "../../utils/textDecorationToken";
import {
	hasTextDecorationToken,
	setTextDecorationToken,
} from "../../utils/textDecorationToken";
import type { StyleEntry } from "../StyleEntry";

/**
 * One decoration line — the underline or the strikethrough — put on or taken off
 * every place the edit reaches, each place keeping the other line it carries.
 * Both lines share one field (`textDecoration`), so the write is worked out per
 * place from what that place holds, never as one value over all of them.
 *
 * With a stretch of an open editor's text selected, the places are the runs it
 * covers, each starting from its own override or else the slot's value.
 * Otherwise they are the whole slots — each slot's own value, and every run
 * overriding `textDecoration` in it, which is not stripped the way
 * runOrTextSlotEntry strips a field: stripping would take the run's own other
 * line with it. A run the write leaves drawn as its slot is drops its override.
 *
 * Reads report whether each of those places carries the line — the slot write
 * reading every run's drawn value, since the write keeps the runs.
 *
 * @param line - The line written and read: `underline` for the `underline` intent, `line-through` for `strikethrough`
 * @returns The pair, its value whether the line is on; following `ctx.textEditRange` when it names the object at hand, and writing the slots the pick reaches (resolveTextSlotIds) otherwise
 * @template TState - The state the entry is written against
 */
export const textDecorationLineEntry = <TState extends ObjectState>(
	line: TextDecorationToken,
): StyleEntry<TState, boolean> => {
	const isLineOn = (decoration: string | undefined): boolean =>
		hasTextDecorationToken(decoration, line);

	/** Whether each run of a body draws the line, a run setting no decoration drawing `slotDecoration`. */
	const readRunLines = (
		rich: RichText,
		slotDecoration: string | undefined,
	): boolean[] =>
		isString(rich) || rich.length === 0
			? [isLineOn(slotDecoration)]
			: rich.map((run) => isLineOn(run.textDecoration ?? slotDecoration));

	const wholeSlot = textSlotEntry<TState, boolean>(
		"textDecoration",
		(slot, on, resolvedStyle) => {
			const slotDecoration = resolvedStyle.textDecoration;
			const nextSlotDecoration =
				isLineOn(slotDecoration) === on
					? slotDecoration
					: setTextDecorationToken(slotDecoration, line, on);
			let isRunChanged = false;
			const setRunLines = (rich: RichText): RichText =>
				mapRichTextRangeStyle(
					rich,
					0,
					richTextLength(rich),
					(runStyle): InlineTextStyle => {
						const runDecoration = runStyle.textDecoration;
						if (runDecoration === undefined || isLineOn(runDecoration) === on) {
							return runStyle;
						}
						isRunChanged = true;
						const nextRunDecoration = setTextDecorationToken(
							runDecoration,
							line,
							on,
						);
						if (nextRunDecoration !== nextSlotDecoration) {
							return { ...runStyle, textDecoration: nextRunDecoration };
						}
						const { textDecoration: _dropped, ...rest } = runStyle;
						return rest;
					},
				);
			// A row-partitioned slot is gone through row by row, each row being a
			// body of its own.
			const content = isTextRows(slot.text)
				? slot.text.map(setRunLines)
				: setRunLines(slot.text);
			if (!isRunChanged && nextSlotDecoration === slotDecoration) {
				return slot;
			}
			return {
				...slot,
				text: isRunChanged ? content : slot.text,
				...(nextSlotDecoration !== slotDecoration && {
					textDecoration: nextSlotDecoration,
				}),
			};
		},
		(slot, resolvedStyle) => {
			const slotDecoration = resolvedStyle.textDecoration;
			if (!isTextRows(slot.text)) {
				return readRunLines(slot.text, slotDecoration);
			}
			// An emptied row list (`[]`) still answers with the slot's value, or the
			// slot would read as not taking the intent at all.
			const rowLines = slot.text.flatMap((row) =>
				readRunLines(row, slotDecoration),
			);
			return rowLines.length === 0 ? [isLineOn(slotDecoration)] : rowLines;
		},
	);

	return {
		apply: (object, pick, on, ctx) => {
			const range = readRangeEdit(object, ctx);
			if (range === null) {
				return wholeSlot.apply(object, pick, on, ctx);
			}
			const slotDecoration = ctx.textStyleDefaults.resolveTextSlotStyle(
				object.type,
				range.textSlotId,
				range.textSlots[range.textSlotId],
			).textDecoration;
			// Styled as the one body the slot's rows read as and split back by the
			// writer the commit also uses (writeRichTextSlot), as runOrTextSlotEntry does.
			const styled = mapRichTextRangeStyle(
				range.content,
				range.start,
				range.end,
				(runStyle) => {
					const runDecoration = runStyle.textDecoration ?? slotDecoration;
					return isLineOn(runDecoration) === on
						? runStyle
						: {
								...runStyle,
								textDecoration: setTextDecorationToken(runDecoration, line, on),
							};
				},
			);
			if (isSameRichText(styled, range.content)) {
				return object;
			}
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
			const slotDecoration = ctx.textStyleDefaults.resolveTextSlotStyle(
				object.type,
				range.textSlotId,
				range.textSlots[range.textSlotId],
			).textDecoration;
			return readRunLines(
				sliceRichText(range.content, range.start, range.end),
				slotDecoration,
			);
		},
	};
};
