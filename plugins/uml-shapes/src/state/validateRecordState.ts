import { isObject, isString } from "@jiscribe/basic-validators";
import type { ObjectStateValidator } from "@jiscribe/canvas";
import { createFrameStateValidator } from "@jiscribe/canvas-sdk";
import type { StateRecord } from "@jiscribe/canvas-sdk";

import {
	isRecordSlotId,
	RECORD_LIST_SLOT_IDS,
	RECORD_NAME_SLOT_ID,
	RECORD_STEREOTYPE_SLOT_ID,
	RecordFeatures,
} from "../schema/RecordDoc";

/** A compartment holds rows: an array of strings, and only that. */
const isRowsSlot = (value: unknown): boolean =>
	isObject(value) && Array.isArray(value.text) && value.text.every(isString);

/** A text band holds one string, newlines and all. */
const isBandSlot = (value: unknown): boolean =>
	isObject(value) && isString(value.text);

/**
 * Pins the record's slot normal form on untrusted state (clipboard, external
 * sync): the title present and holding a string, every optional slot that is
 * there holding the content kind its id fixes, and no key outside the record's
 * own set. The shared text check only knows the general keyed form (any key,
 * either content kind), so without this a pasted record could arrive with a
 * compartment whose rows are not rows, or with a stray key that would be drawn
 * and edited yet mean nothing.
 *
 * The optional slots are checked only when present: which of them a box has is
 * the document's choice, not an invariant (RecordMapper 参照).
 */
const hasRecordTextSlots = (o: StateRecord): boolean => {
	const text = o.text;
	if (!isObject(text)) {
		return false;
	}
	if (Object.keys(text).some((key) => !isRecordSlotId(key))) {
		return false;
	}
	if (!isBandSlot(text[RECORD_NAME_SLOT_ID])) {
		return false;
	}
	const stereotype = text[RECORD_STEREOTYPE_SLOT_ID];
	if (stereotype !== undefined && !isBandSlot(stereotype)) {
		return false;
	}
	return RECORD_LIST_SLOT_IDS.every(
		(slotId) => text[slotId] === undefined || isRowsSlot(text[slotId]),
	);
};

/** Validates RecordState (Frame-family common logic + the record's slot set). */
export const isValidRecordState: ObjectStateValidator =
	createFrameStateValidator(RecordFeatures, hasRecordTextSlots);
