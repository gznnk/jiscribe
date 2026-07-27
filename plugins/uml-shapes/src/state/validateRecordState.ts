import { isObject, isString } from "@workspace/basic-validators";
import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";
import type { StateRecord } from "@workspace/canvas/unstable";

import {
	RECORD_NAME_SLOT_ID,
	RECORD_ROWS_SLOT_ID,
	RecordFeatures,
} from "../schema/RecordDoc";

/**
 * Pins the record's slot normal form on untrusted state (clipboard, external
 * sync): both slots present, and each holding the content kind that slot fixes.
 * The shared text check only knows the general keyed form (any key, either
 * content kind), so without this a pasted record could arrive with no `rows`
 * slot and lose its compartment.
 */
const hasRecordTextSlots = (o: StateRecord): boolean => {
	const text = o.text;
	if (!isObject(text)) {
		return false;
	}
	const name = text[RECORD_NAME_SLOT_ID];
	const rows = text[RECORD_ROWS_SLOT_ID];
	if (!isObject(name) || !isObject(rows)) {
		return false;
	}
	return (
		isString(name.text) && Array.isArray(rows.text) && rows.text.every(isString)
	);
};

/** Validates RecordState (Frame-family common logic + the two required slots). */
export const isValidRecordState: ObjectStateValidator =
	createFrameStateValidator(RecordFeatures, hasRecordTextSlots);
