import { isObject } from "@jiscribe/basic-validators";

import type { RichText } from "../../../schemas/objects/types/RichText";
import {
	joinRichTextLines,
	remapRichText,
	richTextToPlain,
	splitRichTextLines,
} from "../../../schemas/objects/types/RichText";
import type { TextSlot } from "../../../schemas/objects/types/TextSlot";
import {
	isTextRows,
	isTextSlot,
} from "../../../schemas/objects/types/TextSlot";

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
 * order, which would move the slot regardless of where its type wrote it.
 * mapTextDocToState drops one rather than let it reorder the map.
 *
 * Text styling lives per slot and only there: there is no shape-wide typography
 * to fall back to, so every reader takes it off the slot it is drawing.
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
 * Resolves the slot an interaction targets. `targetPart` comes from the DOM
 * ([data-part]) and is therefore untrusted, so it is honored only when it names
 * an actual slot; anything else falls back to the first slot.
 *
 * @param text - The shape's slots; undefined for a shape that holds no text
 * @param targetPart - The pressed element's [data-part], if any
 * @returns The resolved slot id, or undefined when the shape has no slot at all
 */
export const resolveTextSlotId = (
	text: TextSlots | undefined,
	targetPart: string | undefined,
): string | undefined => {
	if (
		text &&
		targetPart !== undefined &&
		Object.prototype.hasOwnProperty.call(text, targetPart)
	) {
		return targetPart;
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
 * Writes edited text back into one slot, splitting on "\n" when that slot holds
 * rows (the inverse of {@link readTextSlot}; an emptied editor writes `[]`, not
 * `[""]`, so the empty rows form stays canonical). Per-range styling survives the
 * edit: the characters the edit left alone keep what they were drawn with
 * (remapRichText), since the editor hands back plain text and could not carry the
 * runs itself. The slot's own styling, the other slots, and the key order are all
 * preserved, so a commit never disturbs anything it did not edit.
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
): TextSlots => {
	const slot = text[slotId];
	if (slot === undefined) {
		return { ...text, [slotId]: { text: value } };
	}
	// Rows go through the same carry-over as a single body: the edited text is one
	// string either way, so the styling is remapped onto it before it is split back
	// into the rows the slot holds.
	const content = isTextRows(slot.text)
		? value === ""
			? []
			: splitRichTextLines(remapRichText(joinRichTextLines(slot.text), value))
		: remapRichText(slot.text, value);
	return {
		...text,
		[slotId]: { ...slot, text: content },
	};
};

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
