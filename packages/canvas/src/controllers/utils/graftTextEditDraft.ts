import { isSameRichText } from "@jiscribe/doc/model/objects/types/text/RichText";

import { resolveTextEdit } from "./resolveTextEdit";
import type { ObjectState } from "../../states/objects/base/ObjectState";
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
 * @param state - The committed objects map with the editing session and the
 *   selection that owns it; no session (or a connector label, whose editor is
 *   already live off its own measurement) grafts nothing
 * @param contentResizer - The per-canvas content-resizer registry; the edited
 *   object's type is looked up there, and one absent from it is grafted with its
 *   stored box untouched
 * @returns A map with only the edited object replaced, or `state.objects` itself
 *   when there is nothing to graft (unchanged reference, so downstream memos hold)
 */
export const graftTextEditDraft = (
	state: Pick<CanvasControllerState, "objects" | "selection" | "textEditState">,
	contentResizer: ObjectContentResizerRegistry,
): Record<string, ObjectState> => {
	const { objects } = state;
	const resolved = resolveTextEdit(state);
	if (resolved?.kind !== "shape") {
		return objects;
	}
	const { object: target, slotId } = resolved;
	if (target.text === undefined) {
		return objects;
	}

	// The draft equals the committed body until the first keystroke (and again
	// whenever it is typed back), so the identity is kept through both.
	if (isSameRichText(readRichTextSlot(target.text, slotId), resolved.text)) {
		return objects;
	}

	const grafted = {
		...target,
		text: writeRichTextSlot(target.text, slotId, resolved.text),
	} as ObjectState;

	const resizeToContent = contentResizer.get(grafted.type);
	return {
		...objects,
		[target.id]: resizeToContent ? resizeToContent(grafted, {}) : grafted,
	};
};
