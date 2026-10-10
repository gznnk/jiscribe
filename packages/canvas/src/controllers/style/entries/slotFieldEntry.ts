import type { SlotsOf } from "./slotEntry";
import { slotEntry } from "./slotEntry";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { StyleEntry } from "../StyleEntry";
import type {
	StyleIntentValueType,
	TextSlotStyleIntentKind,
} from "../StyleIntent";

/**
 * An intent stored as one field of the text slots — where a shape's typography
 * lives, there being no shape-wide copy of it (TextSlots). The plain case: the
 * value lands on the slot and nowhere else, which is what the fields that place
 * the whole block (the alignments) do, having nothing smaller to apply to.
 *
 * A field a stretch of characters can carry on its own (the inline half of a
 * slot's typography, InlineTextStyle) takes `runOrSlotEntry` instead, which
 * also has to answer for the runs that override it.
 *
 * @param field - The slot field written and read, one the text-style defaults answer for; its name is the intent's, and fixes the value type (StyleIntentValueType)
 * @param options - `slotsOf`: which slots the intent lands on (defaultSlotsOf for the core types)
 * @returns The pair, writing `value` as-is and reporting one value per addressed slot
 * @template TState - The state the entry is written against
 * @template K - The field, which decides the value type
 */
export const slotFieldEntry = <
	TState extends ObjectState,
	K extends TextSlotStyleIntentKind,
>(
	field: K,
	{ slotsOf }: { slotsOf: SlotsOf<TState> },
): StyleEntry<TState, StyleIntentValueType<K>> =>
	slotEntry<TState, StyleIntentValueType<K>>(field, slotsOf, (slot, value) =>
		Object.is((slot as Record<string, unknown>)[field], value)
			? slot
			: { ...slot, [field]: value },
	);
