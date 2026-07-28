import { isObject, isString } from "@workspace/basic-validators";
import type { ObjectMapperType } from "@workspace/canvas";
import type { TextSlot } from "@workspace/canvas/doc";
import { isTextSlot } from "@workspace/canvas/doc";
import { createFrameMapper } from "@workspace/canvas/unstable";
import { AUTO_COLOR } from "@workspace/canvas/unstable-doc";

import type { RecordState, RecordTextState } from "./RecordState";
import {
	RECORD_ATTRIBUTES_SLOT_ID,
	RECORD_NAME_SLOT_ID,
	RECORD_OPERATIONS_SLOT_ID,
	RECORD_SLOT_STYLE_DEFAULTS,
	RecordFeatures,
} from "../schema/RecordDoc";
import type { RecordDoc } from "../schema/RecordDoc";

/** Forces the title slot's content to a string, filling omitted styling from the record defaults. */
const normalizeNameSlot = (value: unknown): TextSlot<string> => {
	if (!isTextSlot(value)) {
		return { ...RECORD_SLOT_STYLE_DEFAULTS, text: "" };
	}
	return {
		...RECORD_SLOT_STYLE_DEFAULTS,
		...value,
		text: isString(value.text) ? value.text : "",
	};
};

/**
 * Forces a compartment slot's content to an array of rows, filling omitted
 * styling from the record defaults. The array is always fresh, so records
 * created from the same doc defaults never share one.
 */
const normalizeListSlot = (value: unknown): TextSlot<string[]> => {
	if (!isTextSlot(value)) {
		return { ...RECORD_SLOT_STYLE_DEFAULTS, text: [] };
	}
	const content = value.text;
	return {
		...RECORD_SLOT_STYLE_DEFAULTS,
		...value,
		text: Array.isArray(content) ? content.filter(isString) : [],
	};
};

/**
 * Forces the slots into the record's normal form: the title always present and
 * first, every written compartment typed and styled (omitted typography filled
 * from RECORD_SLOT_STYLE_DEFAULTS — without this, a parsed doc would render with
 * the shared center/middle/16 fallbacks the schema's documented defaults
 * contradict), and the compartments in RECORD_SLOT_IDS order.
 *
 * A compartment the doc left out stays out: the key set is what the drawing and
 * the region split read the box's compartments from. The generic doc → state
 * pass-through keeps whatever a document happened to write (including the wrong
 * order, which would move the Enter-editing default and stack the compartments
 * the wrong way round), so the invariant has to be established once, here.
 */
const normalizeRecordText = (text: unknown): RecordTextState => {
	const slots = isObject(text) ? text : {};
	const normalized: RecordTextState = {
		[RECORD_NAME_SLOT_ID]: normalizeNameSlot(slots[RECORD_NAME_SLOT_ID]),
	};
	if (slots[RECORD_ATTRIBUTES_SLOT_ID] !== undefined) {
		normalized[RECORD_ATTRIBUTES_SLOT_ID] = normalizeListSlot(
			slots[RECORD_ATTRIBUTES_SLOT_ID],
		);
	}
	if (slots[RECORD_OPERATIONS_SLOT_ID] !== undefined) {
		normalized[RECORD_OPERATIONS_SLOT_ID] = normalizeListSlot(
			slots[RECORD_OPERATIONS_SLOT_ID],
		);
	}
	return normalized;
};

const frameMapper = createFrameMapper<RecordDoc, RecordState>(RecordFeatures);

/**
 * RecordDoc <-> RecordState conversion. Frame-family shared logic, plus the slot
 * normal form and the documented defaults (slot typography, fill) on the way in.
 * On the way out the shared logic already emits the keyed object as is, a
 * `"slots"` type's doc and state holding the same value.
 */
export const recordToState: ObjectMapperType<
	RecordDoc,
	RecordState
>["toState"] = (doc) => {
	const state = frameMapper.toState(doc);
	return {
		...state,
		// An omitted fill reads as the documented "auto" (theme surface), not the
		// shared undefined-fallback (transparent).
		fill: state.fill ?? AUTO_COLOR,
		text: normalizeRecordText(state.text),
	};
};

export const recordToDoc: ObjectMapperType<RecordDoc, RecordState>["toDoc"] =
	frameMapper.toDoc;
