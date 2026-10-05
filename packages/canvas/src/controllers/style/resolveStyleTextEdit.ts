import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import { isSameRichText } from "@jiscribe/doc/model/objects/types/text/RichText";

import type { TextEditRange } from "./StyleEntry";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../states/objects/base/TextStyleState";
import {
	readRichTextSlot,
	writeRichTextSlot,
} from "../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../CanvasTypes";
import { resolveTextEdit } from "../utils/resolveTextEdit";
import { resolveTextEditSelection } from "../utils/styleTextEditSelection";

/**
 * The open shape editor as the style walks read it: which slot of which object it
 * is editing, the draft it holds, and the stretch of it a per-range edit would
 * land on.
 */
export type StyleTextEdit = {
	/** The object being edited. */
	objectId: string;
	/** The slot being edited; a key of that object's `text`. */
	slotId: string;
	/** The draft body the editor draws, which the committed slot does not yet hold. */
	draft: RichText;
	/** The selected stretch, null when the edit is not a per-range one (see `StyleContext.textEditRange`). */
	range: TextEditRange | null;
};

/**
 * The open shape editor, for both style walks: the one place they read
 * `textEditState` from, so writing a style and reporting it cannot disagree
 * about what is being edited.
 *
 * The `range` is `resolveTextEditSelection`'s answer, which owns the rule for
 * when a stretch is one to style (a collapsed selection and a source-language
 * body are not).
 *
 * @param state - The canvas state; its `textEditState` and the selection that owns it are read
 * @returns The edit, or null when no shape editor is open (a connector label is not one)
 */
export const resolveStyleTextEdit = (
	state: CanvasControllerState,
): StyleTextEdit | null => {
	const resolved = resolveTextEdit(state);
	if (resolved?.kind !== "shape") {
		return null;
	}
	const { object, slotId, text } = resolved;
	const ranged = resolveTextEditSelection(state);
	return {
		objectId: object.id,
		slotId,
		draft: text,
		range:
			ranged === null
				? null
				: {
						objectId: ranged.objectId,
						slotId: ranged.slotId,
						start: ranged.start,
						end: ranged.end,
					},
	};
};

/**
 * The object with the editor's draft written into the slot being edited, so an
 * entry reads and writes the text that is on screen rather than the last
 * committed one. The walks graft before handing a target over and read the slot
 * back out afterwards, which is what keeps the draft and the slot one text
 * without any entry knowing an editor exists.
 *
 * @param object - The target the walk is about to hand over; one holding no slots is returned as it stands
 * @param edit - The open edit, as {@link resolveStyleTextEdit} resolved it; its `objectId` is the caller's to match
 * @returns The grafted object, or `object` itself when the slot already holds the
 *   draft — which it does until the first keystroke, and again whenever it is
 *   typed back, so an untyped session leaves every target's reference alone
 */
export const graftStyleTextEdit = (
	object: ObjectState,
	edit: StyleTextEdit,
): ObjectState => {
	const slots = (object as ObjectState & TextStyleState).text;
	if (slots === undefined) {
		return object;
	}
	if (isSameRichText(readRichTextSlot(slots, edit.slotId), edit.draft)) {
		return object;
	}
	return {
		...object,
		text: writeRichTextSlot(slots, edit.slotId, edit.draft),
	} as ObjectState;
};
