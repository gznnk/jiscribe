import type { InlineTextStyle } from "../../schemas/objects/types/RichText";
import {
	readRichTextRangeStyle,
	styleRichTextRange,
} from "../../schemas/objects/types/RichText";
import { isTextRows } from "../../schemas/objects/types/TextSlot";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import { writeTextSlot } from "../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../CanvasTypes";
import { toggleTextDecorationToken } from "./toggleTextDecorationToken";

/** The formats a keystroke can turn on and off over the selected text. */
export type TextEditFormat = "bold" | "italic" | "underline";

/**
 * The styling the format lands on: the opposite of what the whole selection is
 * drawn with now, in the same values the shape-wide menu writes (TextFormatMenu),
 * so a run and its slot never disagree about what "bold" is. A selection mixing
 * both reads as unset and therefore turns the format on.
 */
const toggledStyle = (
	format: TextEditFormat,
	current: InlineTextStyle,
): InlineTextStyle => {
	if (format === "bold") {
		return { fontWeight: current.fontWeight === "bold" ? "normal" : "bold" };
	}
	if (format === "italic") {
		return { fontStyle: current.fontStyle === "italic" ? "normal" : "italic" };
	}
	// The other decoration line is kept, and a mixed selection (no shared value)
	// turns underline on.
	return {
		textDecoration: toggleTextDecorationToken(
			current.textDecoration,
			"underline",
		),
	};
};

/**
 * Turns a format on or off over the text the open editor has selected, leaving
 * the rest of the slot as it is.
 *
 * The edited text is written back to the slot first: the editor holds the
 * in-progress string, so styling a stretch of it has to be applied to what is on
 * screen rather than to the last committed text. The session stays open (the
 * caller keeps typing into it) and the selection is untouched, so pressing the
 * same keystroke again toggles the format straight back.
 *
 * @param state - The current canvas controller state
 * @param format - The format the keystroke carries
 * @returns A new state, or `state` itself when nothing applies: no open editor, a
 *   collapsed selection, a slot holding rows (not styled per range), or an object
 *   or slot that no longer resolves
 */
export const toggleTextEditFormat = (
	state: CanvasControllerState,
	format: TextEditFormat,
): CanvasControllerState => {
	const { textEditState } = state;
	if (textEditState?.kind !== "shape") {
		return state;
	}
	const { selection } = textEditState;
	if (selection === undefined || selection.start >= selection.end) {
		return state;
	}

	const target = state.objects[textEditState.objectId];
	if (target === undefined || !isTextStyleState(target)) {
		return state;
	}
	const slots = target.text;
	const slot = slots?.[textEditState.slotId];
	if (slots === undefined || slot === undefined || isTextRows(slot.text)) {
		return state;
	}

	// The draft first, so the offsets the selection carries address the very
	// characters they were measured against.
	const edited = writeTextSlot(slots, textEditState.slotId, textEditState.text);
	const content = edited[textEditState.slotId].text;
	if (isTextRows(content)) {
		return state;
	}
	const styled = styleRichTextRange(
		content,
		selection.start,
		selection.end,
		toggledStyle(
			format,
			readRichTextRangeStyle(content, selection.start, selection.end, slot),
		),
	);

	return {
		...state,
		objects: {
			...state.objects,
			[textEditState.objectId]: {
				...target,
				text: { ...edited, [textEditState.slotId]: { ...slot, text: styled } },
			} as ObjectState,
		},
		commitVersion: state.commitVersion + 1,
	};
};
