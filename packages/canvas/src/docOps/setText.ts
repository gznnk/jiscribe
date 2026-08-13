import { DocOperationError } from "./errors";
import { type ObjectRecord, requireObject } from "./objectAccess";
import { type DocDefinitions, isConnectorObject } from "./objectGeometry";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { RichText } from "../schemas/objects/types/RichText";
import {
	isRichText,
	joinRichTextLines,
	remapRichText,
	splitRichTextLines,
} from "../schemas/objects/types/RichText";
import { isTextRows } from "../schemas/objects/types/TextSlot";

/**
 * The new text for a body that may be styled per range: the characters the
 * rewrite left in place keep the styling they had (remapRichText), the way an
 * edit in the canvas does. A body that was never styled stays the plain string
 * it is.
 */
const rewriteBody = (previous: unknown, text: string): RichText =>
	isRichText(previous) ? remapRichText(previous, text) : text;

/** Set a connector's label text; an empty string drops the label entirely. */
const setConnectorLabelText = (object: ObjectRecord, text: string): void => {
	if (text === "") {
		delete object.label;
		return;
	}
	const label = object.label;
	if (typeof label === "object" && label !== null) {
		(label as Record<string, unknown>).text = text;
		return;
	}
	object.label = { text };
};

/** Slot objects of a `text: "slots"` doc, keyed by slot id. */
const readSlots = (object: ObjectRecord): Record<string, unknown> | null => {
	const slots = object.text;
	return typeof slots === "object" && slots !== null
		? (slots as Record<string, unknown>)
		: null;
};

/**
 * Rewrite one object's text, mutating `doc` in place.
 *
 * What "text" means follows the type: a single-body shape takes the string as it is, a
 * slotted shape rewrites one named slot, and a connector's text is its label — where an
 * empty string removes the label rather than leaving a blank one.
 *
 * @param doc - Mutated in place
 * @param id - Id of the object to retext; must exist in the root tree
 * @param text - The new text. Newlines are kept for a single body and split into one row
 *   each for a slot that holds rows. Styling applied to parts of the old text survives on
 *   the characters the rewrite kept (see {@link rewriteBody})
 * @param definitions - Type table `features.text` is read from
 * @param slot - Which slot to write, for a slotted type only. Omitted is allowed when the
 *   object has exactly one slot; the slot must already exist, since its content shape
 *   (one string or a list of rows) is not inferable for a slot that is absent
 * @throws {@link DocOperationError} when the id is missing, when the type holds no text at
 *   all, or when `slot` is absent/unknown on a slotted type — the message lists the slots
 *   the object actually has
 */
export const setText = (
	doc: CanvasDoc,
	id: string,
	text: string,
	definitions: DocDefinitions,
	slot?: string,
): void => {
	const { object } = requireObject(doc, id);
	if (isConnectorObject(object)) {
		setConnectorLabelText(object, text);
		return;
	}

	const textFeature = definitions.get(object.type)?.features.text;
	if (textFeature === "body") {
		object.text = rewriteBody(object.text, text);
		return;
	}
	if (textFeature !== "slots") {
		throw new DocOperationError(
			`${id} ("${object.type}") holds no text that can be set`,
		);
	}

	const slots = readSlots(object);
	const slotIds = slots === null ? [] : Object.keys(slots);
	if (slots === null || slotIds.length === 0) {
		throw new DocOperationError(`${id} ("${object.type}") has no text slot`);
	}
	const targetSlotId = slot ?? (slotIds.length === 1 ? slotIds[0] : undefined);
	if (targetSlotId === undefined || !slotIds.includes(targetSlotId)) {
		throw new DocOperationError(
			`${id} ("${object.type}") needs the slot to write: ${slotIds.join(" / ")}`,
		);
	}

	const targetSlot = slots[targetSlotId] as Record<string, unknown>;
	// The slot's own content decides the shape: a rows slot rejects a plain string,
	// while an array of runs is one styled body and must not be split into rows.
	targetSlot.text = isTextRows(targetSlot.text)
		? splitRichTextLines(
				remapRichText(joinRichTextLines(targetSlot.text), text),
			)
		: rewriteBody(targetSlot.text, text);
};
