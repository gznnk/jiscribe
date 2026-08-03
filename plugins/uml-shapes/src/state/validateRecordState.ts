import { isObject, isString } from "@workspace/basic-validators";
import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";
import type { StateRecord } from "@workspace/canvas-sdk";

import {
	RECORD_NAME_SLOT_ID,
	RECORD_SLOT_IDS,
	RecordFeatures,
} from "../schema/RecordDoc";

/** A compartment holds rows: an array of strings, and only that. */
const isRowsSlot = (value: unknown): boolean =>
	isObject(value) && Array.isArray(value.text) && value.text.every(isString);

/**
 * Pins the record's slot normal form on untrusted state (clipboard, external
 * sync): the title present and holding a string, every compartment that is there
 * holding rows, and no key outside the record's own set. The shared text check
 * only knows the general keyed form (any key, either content kind), so without
 * this a pasted record could arrive with a compartment whose rows are not rows,
 * or with a stray key that would be drawn and edited yet mean nothing.
 *
 * The optional compartments are checked only when present: which of them a box
 * has is the document's choice, not an invariant (RecordMapper 参照).
 */
const hasRecordTextSlots = (o: StateRecord): boolean => {
	const text = o.text;
	if (!isObject(text)) {
		return false;
	}
	if (
		Object.keys(text).some(
			(key) => !(RECORD_SLOT_IDS as readonly string[]).includes(key),
		)
	) {
		return false;
	}
	const name = text[RECORD_NAME_SLOT_ID];
	if (!isObject(name) || !isString(name.text)) {
		return false;
	}
	return RECORD_SLOT_IDS.filter(
		(slotId) => slotId !== RECORD_NAME_SLOT_ID && text[slotId] !== undefined,
	).every((slotId) => isRowsSlot(text[slotId]));
};

/** Validates RecordState (Frame-family common logic + the record's slot set). */
export const isValidRecordState: ObjectStateValidator =
	createFrameStateValidator(RecordFeatures, hasRecordTextSlots);
