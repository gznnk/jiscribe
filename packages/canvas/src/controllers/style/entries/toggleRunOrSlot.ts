import { resolveRangeEdit } from "./resolveRangeEdit";
import { runOrSlot } from "./runOrSlot";
import type { SlotsOf } from "./slotEntry";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { StyleEntry } from "../StyleEntry";
import type {
	StyleIntentValueType,
	TextToggleIntentKind,
} from "../StyleIntent";
import { TOGGLE_FLIPS } from "../StyleIntent";

/**
 * The one value the places read agree on, or undefined when they do not — which
 * is how a stretch mixing both ends up turning the format **on**: a mixed
 * reading is treated as unset, the same way the menus' rows read it
 * (selectionValueOr).
 *
 * @param values - What `read` reported, one entry per run the stretch covers; an empty list is unset too
 */
const foldToggleValues = <V>(values: readonly V[]): V | undefined => {
	const [first, ...rest] = values;
	return rest.every((value) => Object.is(value, first)) ? first : undefined;
};

/**
 * The value type a toggle works in: its flipped field's. What
 * `StyleIntentValueType<K>` reduces to for a toggle, spelled through TOGGLE_FLIPS
 * so the compiler can see it while the kind is still generic.
 */
type ToggledValue<K extends TextToggleIntentKind> = StyleIntentValueType<
	(typeof TOGGLE_FLIPS)[K]
>;

/**
 * A format the keyboard flips over the text an editor has selected: the entry
 * reads what those characters are drawn with, computes the opposite, and writes
 * it the way the menus write the same field (runOrSlot) — so a keystroke and a
 * menu press cannot disagree about what "bold" is.
 *
 * `apply` acts on a selected stretch and nothing else: with no stretch to flip —
 * no open editor, a collapsed selection, a body whose own syntax carries the
 * emphasis (`features.text: "source"`) — it answers null and the object is left
 * as it stands. A keystroke is not a shape-wide write.
 *
 * @param kind - The toggle; the field it flips is TOGGLE_FLIPS' answer, which fixes the value type too
 * @param options - `slotsOf`: which slots the read falls back to with no stretch selected (defaultSlotsOf for the core types); `toggle`: the value to write given what the stretch is drawn with now, undefined meaning the field is unset there
 * @returns The pair, writing only while a stretch of this object is selected and reporting the field as runOrSlot does
 * @template TState - The state the entry is written against
 * @template K - The toggle, which decides the field and the value type
 */
export const toggleRunOrSlot = <
	TState extends ObjectState,
	K extends TextToggleIntentKind,
>(
	kind: K,
	{
		slotsOf,
		toggle,
	}: {
		slotsOf: SlotsOf<TState>;
		// The flipped field's value type already admits the unset `foldToggleValues`
		// answers with, but with the kind still generic the compiler cannot see that,
		// so it is spelled out here.
		toggle: (
			current: ToggledValue<K> | undefined,
		) => NonNullable<ToggledValue<K>>;
	},
): StyleEntry<TState, ToggledValue<K>> => {
	const styled = runOrSlot(TOGGLE_FLIPS[kind], { slotsOf });

	return {
		// The intent carries no value of its own: the entry reads the current one
		// and flips it (StyleIntent).
		apply: (object, pick, _value, ctx) => {
			if (resolveRangeEdit(object, ctx) === null) {
				return null;
			}
			const current = foldToggleValues(styled.read(object, pick, ctx));
			return styled.apply(object, pick, toggle(current), ctx);
		},
		read: styled.read,
	};
};
