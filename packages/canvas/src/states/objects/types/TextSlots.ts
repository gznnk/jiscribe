import { isObject } from "@jiscribe/basic-validators";
import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import {
	joinRichTextLines,
	normalizeRichText,
	remapRichText,
	richTextToPlain,
	splitRichTextLines,
} from "@jiscribe/doc/model/objects/types/text/RichText";
import type { TextSlot } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import {
	isTextRows,
	isTextSlot,
} from "@jiscribe/doc/model/objects/types/text/TextSlot";

/**
 * A shape's text in its normal form: slot id → slot. These keys ARE the set of
 * text slots the shape has — there is no separate declaration — so both the
 * rendering side and the editing side enumerate slots from here. The mappers
 * guarantee that every slot key of the type is present, typed, and in a stable
 * order; the first key is the default slot (Enter-started editing, and the
 * fallback when a pointer-derived slot id does not match).
 *
 * Because that order carries meaning, an **integer-like slot id ("0", "1", …) is
 * not allowed**: JS enumerates such own keys first and in ascending numeric
 * order, which would move the slot regardless of where its type wrote it. The
 * parser rejects such an id (isIntegerLikeTextSlotId), so no mapper has to.
 *
 * Text styling lives per slot and only there: there is no shape-wide typography
 * to fall back to, so every reader takes it off the slot it is drawing.
 *
 * A type may load its own fields onto a slot beyond `TextSlot`'s (a table cell
 * carries `fill`). This is a contract, not an accident: every shared function
 * that rewrites a slot (`writeRichTextSlot`, `writeTextSlot`, `blankTextSlots`,
 * the slot writers `slotEntry` is built with, `TextSlotStyleProperty`'s
 * `writeSlotValue`) copies it with `{ ...slot }`
 * rather than rebuilding it field by field, so such fields survive. Do not
 * narrow a write to the fields `TextSlot` names.
 */
export type TextSlots = Record<string, TextSlot>;

/**
 * Type guard for the keyed text normal form.
 *
 * @param value - Value to check; an empty object passes (a shape may declare no slot)
 * @returns True when every own property is a valid TextSlot
 */
export const isTextSlots = (value: unknown): value is TextSlots => {
	if (!isObject(value)) {
		return false;
	}
	return Object.values(value).every(isTextSlot);
};

/**
 * The slot opened when nothing designates one (Enter with no slot selected)
 * and the fallback for an unrecognized one.
 *
 * @param text - The shape's slots; undefined for a shape that holds no text
 * @returns The first key in insertion order, or undefined when there is no slot
 */
export const getFirstTextSlotId = (
	text: TextSlots | undefined,
): string | undefined => (text ? Object.keys(text)[0] : undefined);

/**
 * Resolves the slot an interaction targets: the named slot when the shape holds
 * it, else the first slot. The name comes from the DOM (readTextSlotPart) and is
 * therefore untrusted, which is why only an own key of `text` is honored.
 *
 * @param text - The shape's slots; undefined for a shape that holds no text
 * @param slotId - The slot the pressed element named, if any; undefined when the
 *   press named no text slot (a press on the body, or on a part of another kind)
 * @returns The resolved slot id, or undefined when the shape has no slot at all
 */
export const resolveTextSlotId = (
	text: TextSlots | undefined,
	slotId: string | undefined,
): string | undefined => {
	if (
		text &&
		slotId !== undefined &&
		Object.prototype.hasOwnProperty.call(text, slotId)
	) {
		return slotId;
	}
	return getFirstTextSlotId(text);
};

/**
 * Reads a slot's content as the single body of text it draws as: a
 * row-partitioned slot is joined with "\n" (the commit splits it back), and a
 * slot styled per range keeps its runs. The form the drawing and the measuring
 * side take, both of which need the styling; {@link readTextSlot} is the plain
 * counterpart.
 *
 * The join builds a fresh value per call, so a render path that feeds the
 * result to memoized components must hold it (e.g. `useMemo` keyed on the
 * slot's content) rather than re-read every render.
 *
 * @param text - The shape's slots; undefined for a shape that holds no text
 * @param slotId - Key to read; an absent key reads as ""
 * @returns The slot content as one body of text ("" when absent)
 */
export const readRichTextSlot = (
	text: TextSlots | undefined,
	slotId: string,
): RichText => {
	const content = text?.[slotId]?.text;
	if (content === undefined) {
		return "";
	}
	return isTextRows(content) ? joinRichTextLines(content) : content;
};

/**
 * Reads a slot's content as the single string the editor and the plain-text
 * readers work with: a row-partitioned slot is joined with "\n" (the commit
 * splits it back), and a slot styled per range is flattened to its characters.
 *
 * @param text - The shape's slots; undefined for a shape that holds no text
 * @param slotId - Key to read; an absent key reads as ""
 * @returns The slot content as one string ("" when absent)
 */
export const readTextSlot = (
	text: TextSlots | undefined,
	slotId: string,
): string => richTextToPlain(readRichTextSlot(text, slotId));

/**
 * Writes one body of text back into one slot, splitting at its newlines when
 * that slot holds rows (the inverse of {@link readRichTextSlot}; an emptied body
 * writes `[]`, not `[""]`, so the empty rows form stays canonical). The slot's
 * own styling, the other slots, and the key order are all preserved, so a write
 * never disturbs anything it did not edit.
 *
 * @param text - The shape's current slots
 * @param slotId - Key to write; a key absent from `text` is appended as an unstyled slot
 * @param value - The body to write, runs included; stored in canonical form
 * @returns A new slot map (the input is not mutated)
 */
export const writeRichTextSlot = (
	text: TextSlots,
	slotId: string,
	value: RichText,
): TextSlots => {
	const body = normalizeRichText(value);
	const slot = text[slotId];
	if (slot === undefined) {
		return { ...text, [slotId]: { text: body } };
	}
	// The newlines a body carries between rows are the split points, not
	// characters of any row, so their styling (invisible either way) is dropped.
	const content = isTextRows(slot.text)
		? richTextToPlain(body) === ""
			? []
			: splitRichTextLines(body)
		: body;
	return {
		...text,
		[slotId]: { ...slot, text: content },
	};
};

/**
 * Writes edited plain text back into one slot (see {@link writeRichTextSlot}
 * for the slot handling). Per-range styling survives the edit: the characters
 * the edit left alone keep what they were drawn with (remapRichText), since the
 * caller hands back plain text and could not carry the runs itself.
 *
 * @param text - The shape's current slots
 * @param slotId - Key to write; a key absent from `text` is appended as an unstyled slot
 * @param value - The edited text, as one string
 * @returns A new slot map (the input is not mutated)
 */
export const writeTextSlot = (
	text: TextSlots,
	slotId: string,
	value: string,
): TextSlots =>
	writeRichTextSlot(
		text,
		slotId,
		remapRichText(readRichTextSlot(text, slotId), value),
	);

/**
 * Empties every slot's content while keeping the keys, their content kinds, and
 * their styling, for render-only states that must draw no text (the drag-drawing
 * ghost). Per-range styling goes with the characters it styled: with no text
 * left, there is nothing for a run to cover.
 *
 * @param text - The shape's slots
 * @returns A new slot map with "" / [] in place of each content
 */
export const blankTextSlots = (text: TextSlots): TextSlots =>
	Object.fromEntries(
		Object.entries(text).map(([slotId, slot]) => [
			slotId,
			{ ...slot, text: isTextRows(slot.text) ? [] : "" },
		]),
	);
