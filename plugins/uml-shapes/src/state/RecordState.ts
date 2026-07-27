import type { CreateObjectState } from "@workspace/canvas";
import type { TextSlot } from "@workspace/canvas/doc";

import type { RecordFeatures } from "../schema/RecordDoc";

/**
 * The record's slots in the state normal form. Both keys are always present and
 * always in this order — `name` first, so Enter-started editing (which has no
 * pointer position to resolve a slot from) opens the title. Structurally the
 * same as RecordTextDoc: a keyed doc and its state hold the same slot shape, the
 * mapper only filling omitted styling from RECORD_SLOT_STYLE_DEFAULTS.
 */
export type RecordTextState = {
	/** Title shown in the top band. */
	name: TextSlot<string>;
	/** Compartment rows, one entry per line. */
	rows: TextSlot<string[]>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const RecordStateBrand: unique symbol;

/**
 * `text` is replaced rather than extended: the generated TextStyleState types it
 * as the open slot map every text-bearing shape shares, while a record's set is
 * closed and always populated.
 */
export type RecordState = Omit<
	CreateObjectState<typeof RecordFeatures, typeof RecordStateBrand>,
	"text"
> & {
	/** The two text slots; guaranteed present, typed, and styled by RecordMapper. */
	text: RecordTextState;
};
