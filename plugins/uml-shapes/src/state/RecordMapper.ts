import { isObject } from "@jiscribe/basic-validators";
import type { ObjectMapperType } from "@jiscribe/canvas";
import type { RichText, TextSlot } from "@jiscribe/canvas/doc";
import { isRichText, isTextSlot } from "@jiscribe/canvas/doc";
import { createFrameMapper } from "@jiscribe/canvas-sdk";
import { AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";

import type { RecordState, RecordTextState } from "./RecordState";
import {
	isRecordListSlotId,
	RECORD_NAME_SLOT_ID,
	RECORD_SLOT_IDS,
	RECORD_SLOT_STYLE_DEFAULTS_BY_ID,
	RecordFeatures,
} from "../schema/RecordDoc";
import type { RecordDoc, RecordSlotId } from "../schema/RecordDoc";

/**
 * Forces a text band's content to a string, filling omitted styling from the
 * slot's own defaults.
 */
const normalizeBandSlot = (
	value: unknown,
	slotId: RecordSlotId,
): TextSlot<RichText> => {
	const styleDefaults = RECORD_SLOT_STYLE_DEFAULTS_BY_ID[slotId];
	if (!isTextSlot(value)) {
		return { ...styleDefaults, text: "" };
	}
	return {
		...styleDefaults,
		...value,
		text: isRichText(value.text) ? value.text : "",
	};
};

/**
 * Forces a compartment slot's content to an array of rows, filling omitted
 * styling from the slot's own defaults. The array is always fresh, so records
 * created from the same doc defaults never share one.
 */
const normalizeListSlot = (
	value: unknown,
	slotId: RecordSlotId,
): TextSlot<RichText[]> => {
	const styleDefaults = RECORD_SLOT_STYLE_DEFAULTS_BY_ID[slotId];
	if (!isTextSlot(value)) {
		return { ...styleDefaults, text: [] };
	}
	const content = value.text;
	return {
		...styleDefaults,
		...value,
		text: Array.isArray(content) ? content.filter(isRichText) : [],
	};
};

/**
 * Forces the slots into the record's normal form: the title always present, every
 * written slot typed and styled (omitted typography filled from
 * RECORD_SLOT_STYLE_DEFAULTS_BY_ID — without this, a parsed doc would render with
 * the shared center/middle/16 fallbacks the schema's documented defaults
 * contradict), and the keys in RECORD_SLOT_IDS order.
 *
 * A slot the doc left out stays out: the key set is what the drawing and the
 * region split read the box's compartments from. The generic doc → state
 * pass-through keeps whatever order a document happened to write, so the order
 * has to be established once, here.
 *
 * The key order is the order the compartments stack in, which is what makes Tab
 * walk the slots down the box (TextSlots 参照). It costs the title the first key:
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
			? normalizeListSlot(value, slotId)
			: normalizeBandSlot(value, slotId);
	}
	return normalized as RecordTextState;
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
