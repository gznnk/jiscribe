import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import {
	readTextSlot,
	writeTextSlot,
} from "../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Grafts the in-progress editor text onto the object being edited, producing the
 * objects map the rendering and editor-placement layers read. Geometry derived
 * from text (the record's title band, and every region split that follows it)
 * is computed from the slots, so without this graft it would only move once the
 * edit is committed and would jump at that moment.
 *
 * Draft only: the result never reaches the committed state (the reducer, hit
 * testing, snapping, bboxes all stay on `state.objects`), and the write goes
 * through the same {@link writeTextSlot} the commit uses, so a rows-holding slot
 * takes the split form rather than the joined string.
 *
 * @param objects - The committed objects map
 * @param textEditState - The active editing session; null (or a connector label,
 *   whose editor is already live off its own measurement) grafts nothing
 * @returns A map with only the edited object replaced, or `objects` itself when
 *   there is nothing to graft (unchanged reference, so downstream memos hold)
 */
export const graftTextEditDraft = (
	objects: Record<string, ObjectState>,
	textEditState: CanvasControllerState["textEditState"],
): Record<string, ObjectState> => {
	if (textEditState?.kind !== "shape") {
		return objects;
	}

	const target = objects[textEditState.objectId];
	if (
		target === undefined ||
		!isTextStyleState(target) ||
		target.text === undefined ||
		!(textEditState.slotId in target.text)
	) {
		return objects;
	}

	// The draft equals the committed text until the first keystroke (and again
	// whenever it is typed back), so the identity is kept through both.
	if (readTextSlot(target.text, textEditState.slotId) === textEditState.text) {
		return objects;
	}

	return {
		...objects,
		[textEditState.objectId]: {
			...target,
			text: writeTextSlot(
				target.text,
				textEditState.slotId,
				textEditState.text,
			),
		} as ObjectState,
	};
};
