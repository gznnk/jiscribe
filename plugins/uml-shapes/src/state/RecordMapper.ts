import type { ObjectMapperType } from "@jiscribe/canvas";
import { createFrameMapper } from "@jiscribe/canvas-sdk";
import type { RichText, TextSlot } from "@jiscribe/doc";
import { normalizeRichText } from "@jiscribe/doc";

import type { RecordState, RecordTextState } from "./RecordState";
import {
	isRecordListSlotId,
	RECORD_NAME_SLOT_ID,
	RECORD_SLOT_IDS,
	RecordFeatures,
} from "../schema/RecordDoc";
import type {
	RecordDoc,
	RecordSlotId,
	RecordTextDoc,
} from "../schema/RecordDoc";

/**
 * A text band's content, canonicalized the way a `"body"` type's doc is
 * (mapTextDocToState), so a band nobody styled per range is the plain string it
 * was written as. An absent slot is the title's empty band (see
 * {@link normalizeRecordText}); no other band is materialized.
 */
const normalizeBandSlot = (
	value: TextSlot<RichText> | undefined,
): TextSlot<RichText> => {
	if (value === undefined) {
		return { text: "" };
	}
	return { ...value, text: normalizeRichText(value.text) };
};

/**
 * A compartment slot's rows. The array is always fresh, so records created from
 * the same doc defaults never share one.
 */
const normalizeListSlot = (
	value: TextSlot<RichText[]>,
): TextSlot<RichText[]> => ({ ...value, text: [...value.text] });

/**
 * Puts the slots into the record's normal form: the title always present, every
 * written slot's content canonical, and the keys in RECORD_SLOT_IDS order.
 * Typography is deliberately left alone — omitted styling is resolved per read
 * against RECORD_SLOT_STYLE_DEFAULTS_BY_ID (ObjectTextStyleDefaultsRegistry), so
 * a field the author never wrote is not materialized here and does not appear in
 * the document the next save writes.
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
const normalizeRecordText = (
	text: RecordTextDoc | undefined,
): RecordTextState => {
	const slots: Partial<RecordTextDoc> = text ?? {};
	const normalized: Partial<
		Record<RecordSlotId, TextSlot<RichText | RichText[]>>
	> = {};
	for (const slotId of RECORD_SLOT_IDS) {
		if (isRecordListSlotId(slotId)) {
			const rows = slots[slotId];
			if (rows !== undefined) {
				normalized[slotId] = normalizeListSlot(rows);
			}
			continue;
		}
		const band = slots[slotId];
		if (band === undefined && slotId !== RECORD_NAME_SLOT_ID) {
			continue;
		}
		normalized[slotId] = normalizeBandSlot(band);
	}
	return normalized as RecordTextState;
};

const frameMapper = createFrameMapper<RecordDoc, RecordState>(RecordFeatures);

/**
 * RecordDoc <-> RecordState conversion. Frame-family shared logic, plus the slot
 * normal form on the way in. An omitted `fill` is left omitted: the type's own
 * default is resolved per read against RECORD_DOC_DEFAULTS
 * (ObjectShapeStyleDefaultsRegistry), the same way its typography is. On the way
 * out the shared logic already emits the keyed object as is, a `"slots"` type's
 * doc and state holding the same value — and since nothing but the content shape
 * is filled in here, a round trip writes back only what the document carried.
 */
export const recordToState: ObjectMapperType<
	RecordDoc,
	RecordState
>["toState"] = (doc) => {
	const state = frameMapper.toState(doc);
	// Read off the doc rather than `state.text`: the shared pass-through copies the
	// same map over, and the doc is where the slot content is typed as written.
	return {
		...state,
		text: normalizeRecordText(doc.text),
	};
};

export const recordToDoc: ObjectMapperType<RecordDoc, RecordState>["toDoc"] =
	frameMapper.toDoc;
