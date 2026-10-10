import { isSameRichText } from "@jiscribe/doc/model/objects/types/text/RichText";

import { collectStyleTargets } from "./collectStyleTargets";
import type { StyleTextEdit } from "./resolveStyleTextEdit";
import {
	graftStyleTextEdit,
	resolveStyleTextEdit,
} from "./resolveStyleTextEdit";
import { styleEntryOf } from "./styleEntryOf";
import type { StyleIntent } from "./StyleIntent";
import { styleIntentValue } from "./StyleIntent";
import type { StyleIntentRegistries } from "./StyleIntentRegistries";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { readRichTextSlot } from "../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../CanvasTypes";
import { createCowObjects } from "../utils/cowObjects";
import { textSlotsOf } from "../utils/textSlotsOf";

/**
 * The draft the editor is handed back after a write landed on the object it is
 * editing: the slot's new content, so the next keystroke carries the styling
 * instead of writing the body it had before back over it.
 *
 * @param state - The state the walk started from, for the session being redrafted
 * @param edited - The edited object as the walk left it
 * @param textEdit - The open edit, naming the slot to read back
 * @returns The field to override on the state, or undefined when the slot's
 *   content is the draft already — which is the normal case for a write that
 *   only touched the slot's own styling
 */
const redraftTextEdit = (
	state: CanvasControllerState,
	edited: ObjectState,
	textEdit: StyleTextEdit,
): Pick<CanvasControllerState, "textEditState"> | undefined => {
	const { textEditState } = state;
	const slots = textSlotsOf(edited);
	if (textEditState?.kind !== "shape" || slots === undefined) {
		return undefined;
	}
	const content = readRichTextSlot(slots, textEdit.slotId);
	if (isSameRichText(content, textEdit.draft)) {
		return undefined;
	}
	return { textEditState: { ...textEditState, text: content } };
};

/**
 * Reflects one style intent in every object the selection reaches
 * (`collectStyleTargets`), each through its own type's entry for that intent.
 * A target whose type takes no such intent, or whose entry answers null, is left
 * as it stands.
 *
 * The object an editor is open on is handed over with the draft grafted into the
 * slot being edited, and that slot is read back into the draft afterwards
 * (resolveStyleTextEdit) — so a write lands on the text that is on screen and the
 * slot and the draft cannot end up saying different things, without any entry
 * knowing an editor exists. A graft the entry did not write to is dropped: with
 * the rest of its answer when it answered null, from its answer alone when it
 * wrote elsewhere on the object.
 *
 * @param state - The state to write into; its selection decides who is reached
 * @param intent - What to reflect, with its value; one of the core kinds or a name a shape declared for itself (ExtraStyleIntent), the two being looked up in the same table
 * @param registries - The canvas's style tables and the defaults its entries resolve through
 * @returns The next state, or `state` itself (same reference) when no object changed
 */
export const applyStyleIntent = (
	state: CanvasControllerState,
	intent: StyleIntent,
	registries: StyleIntentRegistries,
): CanvasControllerState => {
	const targets = collectStyleTargets(state);
	if (targets.length === 0) {
		return state;
	}

	// Copy-on-write view instead of a full spread: slider drags apply once per
	// pointermove frame (#213). handleGesture / the reducer materialize.
	const updatedObjects = createCowObjects(state.objects);
	const textEdit = resolveStyleTextEdit(state);
	const value = styleIntentValue(intent);
	let changed = false;
	let editedObject: ObjectState | null = null;

	for (const { object, pick, selected } of targets) {
		// Read through the view, so a target the walk has already written to — a
		// group and a member of it can both be selected — is the one written again.
		const current = updatedObjects[object.id];
		const entry = styleEntryOf(
			registries.objectStyle.get(current.type),
			intent.kind,
		);
		if (entry === undefined) {
			continue;
		}
		const isEdited = textEdit !== null && textEdit.objectId === current.id;
		const grafted = isEdited ? graftStyleTextEdit(current, textEdit) : current;
		let updated = entry.apply(grafted, pick, value, {
			selected,
			shapeStyleDefaults: registries.objectShapeStyleDefaults,
			textStyleDefaults: registries.objectTextStyleDefaults,
			objectPartKind: registries.objectPartKind,
			textEditRange: textEdit?.range ?? null,
		});
		if (updated === null || updated === grafted) {
			continue;
		}
		if (isEdited) {
			if (textSlotsOf(updated) !== textSlotsOf(grafted)) {
				editedObject = updated;
			} else if (grafted !== current) {
				// The entry wrote elsewhere on the object (its fill, say) and left the
				// slots as handed: the graft was not part of its answer, and committing
				// the draft is the editor's own business.
				updated = { ...updated, text: textSlotsOf(current) } as ObjectState;
			}
		}
		updatedObjects[object.id] = updated;
		changed = true;
	}

	if (!changed) {
		return state;
	}
	return {
		...state,
		objects: updatedObjects,
		// Only a write that reached the edited object can have changed its slot;
		// one that passed it by leaves the draft alone, the committed slot still
		// being the text it was typed over.
		...(textEdit !== null && editedObject !== null
			? redraftTextEdit(state, editedObject, textEdit)
			: undefined),
	};
};
