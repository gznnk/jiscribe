import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { Rect } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * What an object type tells core about one namespace of its sub-parts — the
 * vertices of a polyline, the cells of a table. Core knows nothing of what an
 * id means: it carries the id around and hands it back to the type through this
 * definition. A type declares these through `ObjectTypeDefinition.partKinds`, one
 * entry per `kind`; a type with `features.text` is given the `"textSlot"` kind
 * on top of what it declares (applyObjectDefinition).
 */
export type ObjectPartKindDefinition<TState extends ObjectState = ObjectState> =
	{
		/**
		 * The part-id namespace this entry answers for: "textSlot", "vertex",
		 * "cell". An identifier, which `register` enforces.
		 */
		kind: string;

		/**
		 * Whether `partId` still names a part of `object` — the staleness check core
		 * runs before acting on a selection the object may have outgrown (a vertex
		 * index left over from an undo, a removed row).
		 */
		has: (object: TState, partId: string) => boolean;

		/**
		 * The part's box in the object's local coordinates, for the overlay that
		 * draws a selected part; null for a part that occupies no area. Omitted = the
		 * kind is never outlined (collectOutlinedPartRegions).
		 */
		region?: (object: TState, partId: string) => Rect | null;

		/**
		 * The box of every part of this kind the object holds, in one call: part id
		 * → box, in the same coordinates as `region`. For a kind whose one part
		 * cannot be placed without laying out the rest (a table's cells). A kind
		 * declaring both answers the same boxes from each; omitted = the boxes are
		 * asked of `region` one part at a time.
		 */
		regions?: (object: TState) => Readonly<Record<string, Rect>>;

		/**
		 * Every part id the object currently holds, in the order Tab walks them.
		 * Omitted = the kind cannot be cycled through.
		 */
		list?: (object: TState) => readonly string[];

		/**
		 * Grows the object by parts after the last one `list` names — a table
		 * appending a row — so that Tab in the open text editor, leaving the last
		 * slot, steps onto the first new one instead of wrapping to the first
		 * (STEP_TEXT_EDIT). Asked of the `"textSlot"` kind alone, and only there:
		 * Shift+Tab and Tab outside the editor always wrap.
		 *
		 * The object returned must keep every part it held under the same id, and
		 * its `list` must name at least one part after the old last one; the step
		 * lands on the first of those, and anything else throws. It goes through
		 * the type's content resizer and re-routes the connectors attached to it
		 * like any structural edit, and joins the commit of the edited slot in one
		 * undo step. Null declines, and the step wraps as if this were omitted.
		 * Omitted = the kind never grows past its last part.
		 */
		extend?: (object: TState) => TState | null;

		/**
		 * The parts a range from `anchorPartId` to `focusPartId` covers, for a kind
		 * whose parts are not laid out in one line — a table's cells, where the run is
		 * the rectangle the two corners span rather than the slice of `list` between
		 * them. Omitted = the linear default (collectPartIdsBetween over `list`),
		 * which is what a sequence of vertices or of tracks wants.
		 *
		 * Every returned id must be a part the object currently holds, given in the
		 * type's own order — the order the writes and reads that follow walk them in.
		 * An empty list is not an answer: a range covers at least the focus, which is
		 * what an undecidable anchor collapses to.
		 */
		range?: (
			object: TState,
			anchorPartId: string,
			focusPartId: string,
		) => readonly string[];

		/**
		 * Whether several parts of this kind can be picked at once, apart from one
		 * another: true lets a Ctrl / Meta-click on a part of the picked kind add it
		 * to the pick or take it out (togglePartByClick). Omitted or false = a pick
		 * of this kind is one part or one Shift range (the vertices), and a
		 * Ctrl / Meta-click toggles the object as a whole instead.
		 */
		multiPick?: boolean;

		/**
		 * Removes the named parts and returns the changed object, or null to refuse
		 * this one deletion while keeping the state as it stands (a polyline already
		 * at its vertex floor). Every id is guaranteed to have passed `has`.
		 *
		 * Omitted entirely means Delete is not about this kind of part: with one of
		 * them picked, the key keeps meaning what it means for the object as a whole.
		 * A kind that wants the key held over a picked part, and nothing removed,
		 * declares a deletion that always refuses (`() => null`).
		 */
		delete?: (object: TState, partIds: readonly string[]) => TState | null;

		/**
		 * The style intent kinds a pick of this kind receives, core kinds
		 * (CoreStyleIntentKind) and a type's own alike. Declared, the ObjectMenu and
		 * the properties sidebar narrow to the controls raising nothing outside it
		 * while one is picked (readPickedPartStyleIntentKinds); omitted = a pick of this
		 * kind leaves the object the subject of every control (the vertices).
		 */
		styleIntentKinds?: ReadonlySet<string>;

		/**
		 * Maps part ids of this kind to the ids of the text slots they contain — a
		 * table row to its cells — which is where the text entries write and read
		 * under a pick of this kind (resolveTextSlotIds). Handed the ids the pick
		 * covers, ranges already expanded (collectObjectPartIds); an id it returns
		 * that `object.text` does not hold is dropped by the caller. Omitted = a pick
		 * of this kind reaches every text slot of the object.
		 */
		textSlotIds?: (
			object: TState,
			partIds: readonly string[],
		) => readonly string[];
	};

/**
 * The part-id namespace of the text slots a text-holding type holds — several
 * for `features.text === "slots"`, the one `body` otherwise — with part ids
 * spelled as the slot keys of the object's `text`.
 * The kind half of the `data-part` its slot elements carry, which `textSlotPart`
 * builds.
 */
export const TEXT_SLOT_PART_KIND = "textSlot";

/** A kind as an identifier: a letter, then letters, digits, `_` or `-`. */
const KIND_IDENTIFIER = /^[A-Za-z][\w-]*$/;

/**
 * Per-type registry of sub-part definitions, keyed by `(type, kind)`.
 * Types that register nothing have no sub-parts: nothing of theirs can be
 * selected one level below the object (reconcileSelection), and
 * deletion falls through to the object as a whole.
 */
export class ObjectPartKindRegistry {
	private readonly entries = new Map<
		ObjectType,
		Map<string, ObjectPartKindDefinition>
	>();

	/**
	 * Replaces everything registered for `type`.
	 *
	 * @param type - The object type these parts belong to
	 * @param parts - One entry per `kind`; a repeated kind throws, since the
	 *   second would silently shadow the first, and so does a kind that is no
	 *   identifier (a letter, then letters, digits, `_` or `-`)
	 */
	register<TState extends ObjectState>(
		type: ObjectType,
		parts: ObjectPartKindDefinition<TState>[],
	): void {
		const byKind = new Map<string, ObjectPartKindDefinition>();
		for (const part of parts) {
			if (!KIND_IDENTIFIER.test(part.kind)) {
				throw new Error(
					`Object part kind "${part.kind}" is no identifier: a letter, then letters, digits, "_" or "-"`,
				);
			}
			if (byKind.has(part.kind)) {
				throw new Error(`Duplicate object part kind "${part.kind}"`);
			}
			byKind.set(part.kind, part as unknown as ObjectPartKindDefinition);
		}
		this.entries.set(type, byKind);
	}

	/**
	 * @param type - The object type to look under
	 * @param kind - The part-id namespace, as the definition spelled it
	 * @returns The definition, or undefined when the type declares no such kind
	 */
	get(type: ObjectType, kind: string): ObjectPartKindDefinition | undefined {
		return this.entries.get(type)?.get(kind);
	}

	clear(): void {
		this.entries.clear();
	}
}

export const createObjectPartKindRegistry = (): ObjectPartKindRegistry =>
	new ObjectPartKindRegistry();
