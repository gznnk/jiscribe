import type { ObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";

import type { StyleIntentKind, StyleValueOf } from "./StyleIntent";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ObjectPartSelection } from "../selection/ObjectPartSelection";

/**
 * How one type reflects one intent: where the edit lands in its own data, and
 * what is there now. Written as a pair on purpose — an intent a type can be
 * asked to apply is one it has to be able to report back, and the type forces
 * both to be spelled.
 *
 * @template TState - The state the entry is written against, its own type's
 * @template V - The intent's value type (StyleValueOf)
 */
export type StyleEntry<TState extends ObjectState, V> = {
	/**
	 * This object with the intent reflected in it, or null when the intent does
	 * not reach it — which is the gate: a target an entry answers null for is
	 * left as it stands. Returning `object` itself says the value was already
	 * there.
	 *
	 * @param object - The target, as it stands after the earlier targets of the same walk
	 * @param pick - What is picked inside this object, null when the whole object is addressed
	 * @param value - The intent's value, already typed
	 * @param ctx - The walk's context (whether this target is selected itself, the defaults registries)
	 */
	apply(
		object: TState,
		pick: ObjectPartSelection | null,
		value: V,
		ctx: StyleContext,
	): TState | null;
	/**
	 * The current value at every place on this object the intent would land,
	 * resolved through the type's defaults so what is reported is what the object
	 * is drawn with. Empty when the intent does not reach it — the reading side
	 * of the same gate `apply` states with null.
	 *
	 * A list rather than one value because one object can hold several of them (a
	 * table row covering a line of cells), which is what lets the reader report
	 * the object as disagreeing with itself.
	 *
	 * @param object - The target to read
	 * @param pick - What is picked inside this object, null when the whole object is addressed
	 * @param ctx - The walk's context (whether this target is selected itself, the defaults registries)
	 */
	read(
		object: TState,
		pick: ObjectPartSelection | null,
		ctx: StyleContext,
	): readonly V[];
};

/**
 * What one type answers for, by intent. A kind left out is one the type does not
 * take — the gate at its coarsest, before any entry is called.
 *
 * @template TState - The state the entries are written against
 */
export type StyleTable<TState extends ObjectState> = {
	[K in StyleIntentKind]?: StyleEntry<TState, StyleValueOf<K>>;
};

/**
 * An entry with its value type erased, the shape the walkers call one through:
 * they take it out of a table by a kind the intent carries at runtime, so the
 * value and the entry cannot be correlated statically.
 */
export type ErasedStyleEntry = StyleEntry<ObjectState, unknown>;

/**
 * What an entry is handed besides the object and the value: everything about the
 * walk it could not be told by its arguments.
 *
 * Text brings the rest of it (the range being edited, the text-style defaults,
 * the part kinds a pick is expanded through) when the text intents move over.
 */
export type StyleContext = {
	/**
	 * Whether this target is one of the selected objects rather than a descendant
	 * reached through a selected group. What the intents that do not descend
	 * (`lockAspectRatio`, `textVerticalBasis`) gate on themselves, so the walk
	 * needs no branch of its own.
	 */
	selected: boolean;
	/** Per-type stroke / fill defaults, so `read` answers with what the object is drawn with. */
	shapeStyleDefaults: ObjectShapeStyleDefaultsRegistry;
};
