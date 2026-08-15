import { isObject } from "@jiscribe/basic-validators";
import type { ObjectMapperType } from "@jiscribe/canvas";
import type { RichText, TextSlot } from "@jiscribe/canvas/doc";
import {
	isRichText,
	isTextSlot,
	normalizeRichText,
} from "@jiscribe/canvas/doc";
import { createFrameMapper } from "@jiscribe/canvas-sdk";
import { AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";

import type { RecordState, RecordTextState } from "./RecordState";
import {
	isRecordListSlotId,
	RECORD_NAME_SLOT_ID,
	RECORD_SLOT_IDS,
	RecordFeatures,
} from "../schema/RecordDoc";
import type { RecordDoc, RecordSlotId } from "../schema/RecordDoc";

/**
 * Forces a text band's content to one body of text, canonicalized the way a
 * `"body"` type's doc is (mapTextDocToState). Canonicalizing is what keeps `[]`
 * out of a band: it passes as an empty run list, yet every reader of a slot's
 * content takes an array for the row-partitioned form (isTextRows), so an edit
 * would write the band back as rows and the record's own validator would reject
 * the document it had loaded.
 */
const normalizeBandSlot = (value: unknown): TextSlot<RichText> => {
	if (!isTextSlot(value)) {
		return { text: "" };
	}
	return {
		...value,
		text: isRichText(value.text) ? normalizeRichText(value.text) : "",
	};
};

/**
 * Forces a compartment slot's content to an array of rows. The array is always
 * fresh, so records created from the same doc defaults never share one.
 */
const normalizeListSlot = (value: unknown): TextSlot<RichText[]> => {
	if (!isTextSlot(value)) {
		return { text: [] };
	}
	const content = value.text;
	return {
		...value,
		text: Array.isArray(content) ? content.filter(isRichText) : [],
	};
};

/**
 * Forces the slots into the record's normal form: the title always present,
 * every written slot holding the content kind its id fixes, and the keys in
 * RECORD_SLOT_IDS order. Typography is deliberately left alone — omitted styling
 * is resolved per read against RECORD_SLOT_STYLE_DEFAULTS_BY_ID
 * (ObjectTextStyleDefaultsRegistry), so a field the author never wrote is not
 * materialized here and does not appear in the document the next save writes.
 *
 * A slot the doc left out stays out: the key set is what the drawing and the
 * region split read the box's compartments from. The generic doc → state
 * pass-through keeps whatever order a document happened to write, so the order
 * has to be established once, here.
 *
 * The key order is the order the compartments stack in, which is what makes Tab
 * walk the slots down the box (see TextSlots). It costs the title the first key:
 * on a stereotyped record `stereotype` holds it, so editing that designates no
 * slot (Enter with nothing but the object selected) opens the stereotype band.
 */
const normalizeRecordText = (text: unknown): RecordTextState => {
	const slots = isObject(text) ? text : {};
	const normalized: Partial<
		Record<RecordSlotId, TextSlot<RichText | RichText[]>>
	> = {};
	for (const slotId of RECORD_SLOT_IDS) {
		const value = slots[slotId];
		if (value === undefined && slotId !== RECORD_NAME_SLOT_ID) {
			continue;
		}
		normalized[slotId] = isRecordListSlotId(slotId)
			? normalizeListSlot(value)
			: normalizeBandSlot(value);
	}
	return normalized as RecordTextState;
};

const frameMapper = createFrameMapper<RecordDoc, RecordState>(RecordFeatures);

/**
 * RecordDoc <-> RecordState conversion. Frame-family shared logic, plus the slot
 * normal form and the documented fill default on the way in. On the way out the
 * shared logic already emits the keyed object as is, a `"slots"` type's doc and
 * state holding the same value — and since nothing but the content shape is
 * filled in here, a round trip writes back only what the document carried.
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
