import type { ObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import type { ObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";

import type { StyleIntentKind, StyleIntentValueType } from "./StyleIntent";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ObjectPartSelection } from "../selection/ObjectPartSelection";

/**
 * How one type reflects one intent: where the edit lands in its own data, and
 * what is there now. Written as a pair on purpose — an intent a type can be
 * asked to apply is one it has to be able to report back, and the type forces
 * both to be spelled.
 *
 * @template TState - The state the entry is written against, its own type's
 * @template V - The intent's value type (StyleIntentValueType)
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
	/**
	 * The top-level field(s) of the object this entry writes, checked at
	 * registration against what the type's doc may hold (applyObjectDefinition) —
	 * so an entry cannot write state the mapper then drops on save.
	 *
	 * Omitted means the entry writes nothing the document stores (the toggles,
	 * which flip a field of the slots) or is one of the engine's own, whose fields
	 * the type's `features` already vouch for.
	 */
	readonly fields?: readonly string[];
};

/**
 * An entry under a kind the engine does not own: one the declaring type names
 * for itself, whose value type is that type's business and so `unknown` here.
 * Every entry of the engine's own kinds is assignable to it as well (StyleEntry's
 * members are method signatures), which is what lets {@link StyleTable} hold the
 * typed kinds and the open index signature in one intersection.
 */
export type ExtraStyleEntry = StyleEntry<ObjectState, unknown>;

/**
 * What one type answers for, by intent. A kind left out is one the type does not
 * take — the gate at its coarsest, before any entry is called.
 *
 * The engine's own kinds are typed one by one, each entry bound to that intent's
 * value type. Any other name is a kind the declaring type owns
 * (ObjectTypeDefinition.style), whose stored type the engine does not know, so
 * those cannot be typed per kind and sit under the index signature instead — the
 * read a plugin does through the table it declared is typed from that table
 * rather than from here ({@link StyleEntryValueType}).
 *
 * @template TState - The state the entries are written against
 */
export type StyleTable<TState extends ObjectState> = {
	[K in StyleIntentKind]?: StyleEntry<TState, StyleIntentValueType<K>>;
} & {
	[extraKind: string]: ExtraStyleEntry | undefined;
};

/**
 * The value type one entry works in, read off the entry itself. What a read
 * through a declared table answers (readSelectionStyle / useSelectionStyle), so
 * a type states what its own kind holds once — in the table — and the rows
 * stating it back need no guard of their own.
 *
 * @template TEntry - The entry as the table holds it; a kind the table leaves
 *   out contributes nothing (`never`), the absent entry matching no pair
 */
export type StyleEntryValueType<TEntry> =
	TEntry extends StyleEntry<ObjectState, infer TValue> ? TValue : never;

/**
 * The stretch of text an open editor has selected, as the entries are handed it:
 * which object and slot it lies in, and where it starts and ends.
 *
 * Offsets are UTF-16 code units of the slot's content as the editor draws it —
 * a row-partitioned slot read as its rows joined by "\n" (`readRichTextSlot`),
 * which is the body the editor's own `selectionStart` counts in.
 */
export type TextEditRange = {
	/** The object being edited; an entry compares it against the target it was handed. */
	objectId: string;
	/** The slot being edited; a key of that object's `text`. */
	slotId: string;
	/** First selected offset. */
	start: number;
	/** First offset past the selection; always greater than `start`. */
	end: number;
};

/**
 * What an entry is handed besides the object and the value: everything about the
 * walk it could not be told by its arguments.
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
	/** Per-type text-style defaults, so a slot read answers with what it is drawn with. */
	textStyleDefaults: ObjectTextStyleDefaultsRegistry;
	/**
	 * The stretch of text the open editor has selected, when a per-range write or
	 * read is what the edit means; null otherwise — no open shape editor, a
	 * collapsed selection, or a body written in a source language
	 * (`features.text: "source"`), whose characters carry no styling of their own
	 * and so takes the whole-slot write instead.
	 *
	 * The object it names is handed to the entry with the editor's draft already
	 * grafted into that slot, so the offsets address the content the entry reads
	 * (see resolveStyleTextEdit).
	 */
	textEditRange: TextEditRange | null;
};
