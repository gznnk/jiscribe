import { isNumber, isObject } from "@jiscribe/basic-validators";
import type { ObjectStateValidator } from "@jiscribe/canvas";
import { createFrameStateValidator } from "@jiscribe/canvas-sdk";
import type { StateRecord } from "@jiscribe/canvas-sdk";
import { isRichText, isTextRows, isTextSlot } from "@jiscribe/doc";

import {
	countErEntityColumns,
	erEntityTextSlotIds,
} from "../schema/erEntityColumnIds";
import {
	ER_ENTITY_MIN_SLOT_WIDTHS,
	ER_ENTITY_MIN_WIDTH,
	ErEntityFeatures,
} from "../schema/ErEntityDoc";

/**
 * One slot holds one body of text. The row-partitioned form is refused although
 * the shared slot guard admits it: the doc has no way to write rows, so a slot
 * holding them would be drawn yet saved as something the doc validator refuses.
 */
const isErEntityTextSlot = (value: unknown): boolean =>
	isTextSlot(value) && isRichText(value.text) && !isTextRows(value.text);

/** A width the doc side would accept: a number of at least `minimum` px. */
const isWidthAtLeast = (value: unknown, minimum: number): boolean =>
	isNumber(value) && value >= minimum;

/** The three stated slot widths as the doc side would accept them: the key gutter's may be absent, the rest may not. */
const isValidSlotWidths = (o: StateRecord): boolean =>
	(o.keyWidth === undefined ||
		isWidthAtLeast(o.keyWidth, ER_ENTITY_MIN_SLOT_WIDTHS.keyWidth)) &&
	isWidthAtLeast(o.nameWidth, ER_ENTITY_MIN_SLOT_WIDTHS.nameWidth) &&
	isWidthAtLeast(o.typeWidth, ER_ENTITY_MIN_SLOT_WIDTHS.typeWidth);

/**
 * Pins the entity's slot set on untrusted state (clipboard, external sync): the
 * title plus exactly three slots per column, in erEntityTextSlotIds order, each
 * holding one body of text, and a width and slot widths the doc side would accept. The shared
 * text check only knows the general keyed form, so without this a pasted entity
 * could arrive with a column missing its type slot — drawn without a place to
 * edit it — or a stray key that would be drawn and saved nowhere.
 *
 * The key order is checked too: it is what Tab walks (TextSlots).
 */
const isValidErEntityContent = (o: StateRecord): boolean => {
	if (!isWidthAtLeast(o.width, ER_ENTITY_MIN_WIDTH)) {
		return false;
	}
	if (!isWidthAtLeast(o.derivedWidth, ER_ENTITY_MIN_WIDTH)) {
		return false;
	}
	if (!isValidSlotWidths(o)) {
		return false;
	}
	const text = o.text;
	if (!isObject(text)) {
		return false;
	}
	const slotIds = erEntityTextSlotIds(countErEntityColumns(text));
	const keys = Object.keys(text);
	if (
		keys.length !== slotIds.length ||
		keys.some((key, index) => key !== slotIds[index])
	) {
		return false;
	}
	return Object.values(text).every(isErEntityTextSlot);
};

/** Validates ErEntityState (Frame-family common logic + the slot set). */
export const isValidErEntityState: ObjectStateValidator =
	createFrameStateValidator(ErEntityFeatures, isValidErEntityContent);
