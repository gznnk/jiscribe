import type {
	InlineTextStyle,
	RichText,
} from "../../schemas/objects/types/RichText";
import {
	splitRichTextLines,
	styleRichTextRange,
} from "../../schemas/objects/types/RichText";
import type { TextSlot } from "../../schemas/objects/types/TextSlot";
import { isTextRows } from "../../schemas/objects/types/TextSlot";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import type { TextSlots } from "../../states/objects/types/TextSlots";
import {
	readRichTextSlot,
	writeTextSlot,
} from "../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * The stretch of text the open editor has selected, resolved against the object
 * it is editing. `content` already has the edited text written into the slot: the
 * editor holds the in-progress string, so the offsets the selection carries only
 * address the characters on screen once the draft is in place.
 */
export type TextEditSelection = {
	objectId: string;
	slotId: string;
	/** The edited slot, whose own styling is what a run falls back to. */
	slot: TextSlot;
	/** Every slot of the object, with the draft already written into the edited one. */
	slots: TextSlots;
	/**
	 * The edited slot's content, draft included, as the single body the editor
	 * draws — a row-partitioned slot joined by "\n", which is the text its offsets
	 * count in.
	 */
	content: RichText;
	/**
	 * Whether the edited slot is row-partitioned, and so takes `content` back split
	 * at its newlines rather than whole.
	 */
	isRowPartitioned: boolean;
	/** First selected offset, in UTF-16 code units of `content`. */
	start: number;
	/** First offset past the selection; always greater than `start`. */
	end: number;
};

/**
 * Resolves what the open editor has selected, for the reading and the writing
 * side of per-range styling alike.
 *
 * @param state - The current canvas controller state
 * @returns The selection, or null when there is nothing to style a stretch of: no
 *   open shape editor, a collapsed (or unreported) selection, or an object or slot
 *   that no longer resolves
 */
export const resolveTextEditSelection = (
	state: CanvasControllerState,
): TextEditSelection | null => {
	const { textEditState } = state;
	if (textEditState?.kind !== "shape") {
		return null;
	}
	const { selection } = textEditState;
	if (selection === undefined || selection.start >= selection.end) {
		return null;
	}

	const target = state.objects[textEditState.objectId];
	if (target === undefined || !isTextStyleState(target)) {
		return null;
	}
	const slot = target.text?.[textEditState.slotId];
	if (target.text === undefined || slot === undefined) {
		return null;
	}

	const slots = writeTextSlot(
		target.text,
		textEditState.slotId,
		textEditState.text,
	);
	return {
		objectId: textEditState.objectId,
		slotId: textEditState.slotId,
		slot,
		slots,
		content: readRichTextSlot(slots, textEditState.slotId),
		isRowPartitioned: isTextRows(slot.text),
		start: selection.start,
		end: selection.end,
	};
};

/**
 * Styles the text the open editor has selected, leaving the rest of the slot as
 * it is: what the bold / italic / underline keystrokes and the text menus write
 * while an editor is open.
 *
 * The edited text is committed into the slot on the way (see
 * {@link resolveTextEditSelection}). The session stays open — the caller keeps
 * typing into it — and the selection is untouched, so styling the same stretch
 * again lands on the same characters.
 *
 * A row-partitioned slot is styled as the one body its rows read as and split
 * back afterwards, so a stretch reaching over a row boundary styles each row's
 * share of it.
 *
 * @param state - The current canvas controller state
 * @param style - The fields to override on the selected characters; an omitted
 *   one leaves what those characters already carry
 * @returns A new state, or `state` itself when there is no selection to style
 */
export const styleTextEditSelection = (
	state: CanvasControllerState,
	style: InlineTextStyle,
): CanvasControllerState => {
	const selection = resolveTextEditSelection(state);
	if (selection === null) {
		return state;
	}
	const target = state.objects[selection.objectId];
	const styled = styleRichTextRange(
		selection.content,
		selection.start,
		selection.end,
		style,
	);
	// The newlines a stretch spanning rows also styles are dropped by the split,
	// which is why a styled "\n" cannot survive into the rows (writeTextSlot splits
	// the same way, `[]` included, so both writers leave the slot in one form).
	const content = selection.isRowPartitioned
		? styled === ""
			? []
			: splitRichTextLines(styled)
		: styled;

	return {
		...state,
		objects: {
			...state.objects,
			[selection.objectId]: {
				...target,
				text: {
					...selection.slots,
					[selection.slotId]: { ...selection.slot, text: content },
				},
			} as ObjectState,
		},
		commitVersion: state.commitVersion + 1,
	};
};
