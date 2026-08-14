import { isSameRichText } from "../../schemas/objects/types/RichText";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import {
	readRichTextSlot,
	writeRichTextSlot,
} from "../../states/objects/types/TextSlots";
import type { ObjectContentResizerRegistry } from "../../states/registry/ObjectContentResizerRegistry";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Grafts the in-progress editor text onto the object being edited, producing the
 * objects map the rendering, editor-placement and menu-anchoring layers read.
 * Geometry derived from text (the record's title band, and every region split
 * that follows it) is computed from the slots, so without this graft it would
 * only move once the edit is committed and would jump at that moment.
 *
 * Draft only: the result never reaches the committed state (the reducer, hit
 * testing and snapping all stay on `state.objects`), and the write goes
 * through the same {@link writeRichTextSlot} the commit uses, so a rows-holding
 * slot takes the split form rather than the joined body.
 *
 * @param objects - The committed objects map
 * @param textEditState - The active editing session; null (or a connector label,
 *   whose editor is already live off its own measurement) grafts nothing
 * @param fontFamily - Family the host draws unstyled text in
 *   (`docDefaults.fontFamily`). Only read for objects whose box is measured from
 *   their text, which are re-measured against the draft so the box follows every
 *   keystroke instead of jumping at commit
 * @param contentResizer - The per-canvas content-resizer registry; the edited
 *   object's type is looked up there, and one absent from it is grafted with its
 *   stored box untouched
 * @returns A map with only the edited object replaced, or `objects` itself when
 *   there is nothing to graft (unchanged reference, so downstream memos hold)
 */
export const graftTextEditDraft = (
	objects: Record<string, ObjectState>,
	textEditState: CanvasControllerState["textEditState"],
	fontFamily: string,
	contentResizer: ObjectContentResizerRegistry,
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

	// The draft equals the committed body until the first keystroke (and again
	// whenever it is typed back), so the identity is kept through both.
	if (
		isSameRichText(
			readRichTextSlot(target.text, textEditState.slotId),
			textEditState.text,
		)
	) {
		return objects;
	}

	const grafted = {
		...target,
		text: writeRichTextSlot(
			target.text,
			textEditState.slotId,
			textEditState.text,
		),
	} as ObjectState;

	const resizeToContent = contentResizer.get(grafted.type);
	return {
		...objects,
		[textEditState.objectId]: resizeToContent
			? resizeToContent(grafted, { fontFamily })
			: grafted,
	};
};
