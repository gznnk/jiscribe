import type { CreateObjectState } from "@jiscribe/canvas";
import type { TextSlot } from "@jiscribe/doc";

import type { RecordFeatures } from "../schema/RecordDoc";

/**
 * The record's slots in the state normal form. `name` is always present, and a
 * slot the doc left out stays out — the key set is what gives the box its
 * compartments (createFrameObject enumerates it). The keys are in the order the
 * compartments stack, the stereotype ahead of the title
 * (see calcRecordSlotRegions), which also makes the stereotype the first key —
 * and so the default slot — on a box that has one (see normalizeRecordText).
 *
 * Structurally the same as RecordTextDoc: a keyed doc and its state hold the same
 * slot shape, the mapper only forcing the content kind each slot id fixes.
 * Omitted typography stays omitted here too, and is resolved per read against
 * RECORD_SLOT_STYLE_DEFAULTS_BY_ID (ObjectTextStyleDefaultsRegistry).
 */
export type RecordTextState = {
	/** Stereotype line drawn above the title; absent when the box has no stereotype band. */
	stereotype?: TextSlot<string>;
	/** Title shown in the top band. */
	name: TextSlot<string>;
	/** Attribute rows; absent when the box has no attribute compartment. */
	attributes?: TextSlot<string[]>;
	/** Operation rows; absent when the box has no operation compartment. */
	operations?: TextSlot<string[]>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const RecordStateBrand: unique symbol;

/**
 * `text` is replaced rather than extended: the generated TextStyleState types it
 * as the open slot map every text-bearing shape shares, while a record's set is
 * closed and its title always populated.
 */
export type RecordState = Omit<
	CreateObjectState<typeof RecordFeatures, typeof RecordStateBrand>,
	"text"
> & {
	/** The text slots; typed and ordered by RecordMapper, with `name` guaranteed. */
	text: RecordTextState;
};
